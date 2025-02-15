<script lang="ts">
	import 'tippy.js/dist/tippy.css';

	import Button from '../components/ui/button.svelte';
	import AnimatedText from '../components/ui/animated-text.svelte';
	import History from './History.svelte';
	import type { HistoryRecord, Pagination } from './types';
	import LogoAnimated from '../components/ui/logo-animated.svelte';
	import Textarea from '../components/ui/textarea.svelte';
	import { goto } from '$app/navigation';
	import { Constants } from '$lib/constants';

	let searchQuery = $state('');
	let isLoading = $state(false);
	let isDeepLoading = $state(false);
	let searchResults = $state(null);
	let error = $state(null);
	let searchHistory = $state<HistoryRecord[]>([]);
	let pagination = $state<Pagination>({
		cur: 0,
		maxPerPage: 10,
		total: 0
	});
	function setPagination(p: Pagination) {
		pagination = { ...pagination, ...p };
	}
	let suggestions = $state([]);
	let markedLib = $state(null);

	let isButtonDisabled = $state(false);

	$effect(() => {
		isButtonDisabled = searchQuery.length < 3 || isLoading || isDeepLoading;
	});

	async function performQuickSearch() {
		isLoading = true;
		error = null;

		try {
			const response = await fetch(`${Constants.apiUrl}/api/scraper?search=${searchQuery}`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${localStorage.getItem('authToken')}`
				}
			});

			if (response.ok) {
				const result = await response.json();
				searchResults = result.formatted_result;

				addToSearchHistory({
					query: searchQuery,
					type: 'quick',
					timestamp: Date.now(),
					results: searchResults
				});
			} else {
				if (response.status === 401) {
					goto('/auth');
					// window.location.href = '/auth';
				}

				if (response.status === 429) {
					throw new Error('You have reached the interaction limit. Please try again later.');
				}

				throw new Error(response.statusText);
			}
		} catch (err) {
			error = err.message || 'An error occurred during quick search. Please try again.';
		} finally {
			isLoading = false;
		}
	}

	async function performDeepSearch() {
		isDeepLoading = true;
		error = null;

		try {
			const response = await fetch(`${Constants.apiUrl}/api/scraper-deep?search=${searchQuery}`, {
				method: 'GET',
				headers: {
					Authorization: `Bearer ${localStorage.getItem('authToken')}`
				}
			});

			if (response.status === 401) {
				// window.location.href = '/auth';
				goto('/auth');
			}

			if (response.status === 429) {
				throw new Error('You have reached the interaction limit. Please try again later.');
			}

			if (response.ok) {
				const result = await response.json();
				searchResults = result.formatted_result;
			} else {
				throw new Error(response.statusText);
			}

			addToSearchHistory({
				query: searchQuery,
				type: 'deep',
				timestamp: Date.now(),
				results: searchResults
			});
		} catch (err) {
			error = 'An error occurred during deep search. Please try again.';
		} finally {
			isDeepLoading = false;
		}
	}

	function addToSearchHistory(searchItem) {
		searchHistory = [searchItem, ...searchHistory];
	}

	function handleSubmit(e: Event, type: 'quick' | 'deep') {
		e.preventDefault();
		if (searchQuery.length < 3) return;

		if (type === 'quick') {
			performQuickSearch();
		} else {
			performDeepSearch();
		}

		suggestions = [];
	}

	async function getSuggestions(e) {
		const searchTerm = e.target.value;

		searchQuery = searchTerm;

		const response = await fetch(`${Constants.unbornApiUrl}/api/suggestions?q=${searchTerm}`);
		const xmlString = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
		suggestions = Array.from(xmlDoc.getElementsByTagName('suggestion')).map((suggestion) =>
			suggestion.getAttribute('data')
		);
	}

	function handleClickToHistory(hR) {
		searchResults = markedLib?.(hR.results) || '';
		searchQuery = hR.query;
		window.scrollTo({
			top: 0,
			behavior: 'smooth'
		});
	}

	// Lifecycle
	$effect(() => {
		const init = async () => {
			try {
				const authToken = localStorage.getItem('authToken');
				if (!authToken) {
					// window.location.href = '/auth';
					goto('/auth');
					return;
				}

				document.title = 'Scrapper';

				try {
					const tippy = (await import('tippy.js')).default;
					if (tippy) tippy('[data-tippy-content]');
				} catch (err) {
					console.log(err);
				}

				const { marked } = await import('marked');
				markedLib = marked;

				const token = localStorage.getItem('authToken');

				const response = await fetch(`${Constants.unbornApiUrl}/api/search-history`, {
					method: 'GET',
					headers: {
						Authorization: `Bearer ${token}`
					}
				});

				if (response.status === 401) {
					// window.location.href = '/auth';
					// goto('/auth');
					// return;
				}

				const history = (await response.json()) || [];
				pagination = { ...pagination, total: history.length };

				history.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

				searchHistory = history.map((hR) => ({
					query: hR.query,
					type: hR.action_name === 'scrapper' ? 'quick' : 'deep',
					timestamp: new Date(hR.created_at).getTime(),
					results: hR.results
				}));
			} catch (err) {
				console.error(err);
			}
		};

		init();
	});
</script>

<div class="min-h-screen w-full bg-black text-gray-100">
	<main class="relative z-10 container mx-auto py-4 sm:py-6 lg:py-8">
		<div class="mx-auto max-w-4xl">
			<h1
				class="main-title animate-fade-in-out mb-4 flex justify-center gap-[0.5rem] border-b-2 border-transparent pb-2 text-center align-middle text-2xl font-bold tracking-tight sm:mb-8 sm:text-3xl"
			>
				<LogoAnimated isLoading={isLoading || isDeepLoading} />
				<AnimatedText text="Scrapper" />
			</h1>

			<div class="rounded-xl bg-black px-2 shadow-2xl sm:py-6">
				<form onsubmit={(e) => e.preventDefault()} class="mb-4 sm:mb-6">
					<div class="search-buttons-container flex flex-col gap-3 sm:flex-row">
						<div class="relative flex-1">
							<Textarea
								onkeydown={(e) => {
									if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
										handleSubmit(e, 'quick');
									}
								}}
								onblur={(e) => {
									e.target.style.height = 'auto';
								}}
								value={searchQuery}
								oninput={getSuggestions}
								class="w-full border-slate-700 p-2"
								placeholder="Enter your search query..."
								required
							/>

							{#if suggestions.length > 0}
								<div
									class="suggestions w-ful mt-[0.5rem] h-[8rem] max-h-[8rem] overflow-y-scroll rounded-md border border-slate-700 p-1"
								>
									{#each suggestions as suggestion, idx}
										<Button
											variant="ghost"
											onclick={() => {
												searchQuery = suggestion;
												suggestions = [];
											}}
											class="w-full cursor-pointer justify-start rounded-sm text-start text-sm transition-all"
										>
											{suggestion}
										</Button>
									{/each}
								</div>
							{/if}
						</div>

						<div class="flex items-start gap-2 align-middle">
							<span
								class="max-sm:w-full"
								data-tippy-content="Quick Search performs parallel searches across Google, Bing, and DuckDuckGo, combining results and using AI to format them into a comprehensive summary."
							>
								<Button
									variant="default"
									class="relative max-sm:w-full"
									onclick={(e) => handleSubmit(e, 'quick')}
									disabled={isButtonDisabled}
								>
									<div class="flex origin-center justify-center align-middle">
										<span>{isLoading ? 'Searching...' : 'Quick Search'}</span>
									</div>
								</Button>
							</span>

							<span
								class="max-sm:w-full"
								data-tippy-content="Deep Search performs an extensive Google search, recursively analyzing all inner links to gather comprehensive information."
							>
								<Button
									variant="default"
									class="relative max-sm:w-full"
									onclick={(e) => handleSubmit(e, 'deep')}
									disabled={isButtonDisabled}
								>
									<div class="flex origin-center justify-center align-middle">
										<span>{isDeepLoading ? 'Searching...' : 'Deep Search'}</span>
									</div>
								</Button>
							</span>
						</div>
					</div>
				</form>

				{#if error}
					<div
						class="mb-4 rounded-lg border border-red-700 bg-red-900/50 p-3 text-sm text-red-300 sm:p-4 sm:text-base"
					>
						{error}
					</div>
				{/if}

				{#if !searchResults && !error && !(isLoading || isDeepLoading)}
					<div class="py-6 text-center sm:py-8">
						<p class="text-slate-400">
							{searchQuery?.trim()?.length > 3
								? 'Press Cmd+Enter'
								: 'Enter a search query to get started'}
						</p>
					</div>
				{/if}

				{#if isLoading || isDeepLoading}
					<div class="py-6 text-center sm:py-8">
						<p class="text-slate-400">Scrapping the web for get you info</p>
					</div>
				{:else if searchResults}
					<div
						class="markdown prose prose-invert my-4 max-w-none space-y-4 text-sm sm:my-6 sm:text-base"
					>
						{@html markedLib?.(searchResults)?.replace(
							/<a /g,
							'<a target="_blank" rel="noopener noreferrer" '
						)}
					</div>
				{/if}
			</div>

			<!-- <History
				disabled={isLoading || isDeepLoading}
				history={searchHistory}
				{handleClickToHistory}
				{pagination}
				{setPagination}
			/> -->
		</div>
	</main>
</div>

<style>
	.suggestions {
		max-height: 8rem;
		overflow-y: scroll;
	}
	.markdown > :global(ol) {
		margin: 1rem 0;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}
</style>
