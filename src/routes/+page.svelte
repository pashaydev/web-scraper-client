<script lang="ts">
	import 'tippy.js/dist/tippy.css';
	import Button from '../components/ui/button.svelte';
	import AnimatedText from '../components/ui/animated-text.svelte';
	import LogoAnimated from '../components/ui/logo-animated.svelte';
	import Textarea from '../components/ui/textarea.svelte';
	import { goto } from '$app/navigation';
	import { Constants } from '$lib/constants';
	import tippy from 'tippy.js';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	let searchQuery = $state('');
	let isLoading = $state(false);
	let isDeepLoading = $state(false);

	type SearchResult = {
		title: string;
		snippet: string;
		link: string;
		inner_content: string;
		source: string;
	};

	let formattedResults = $state<string>('');
	let allResults = $state<SearchResult[]>([]);

	let error = $state(null);
	let suggestionsOpen = $state(false);

	type SearchTab = 'formatted' | 'raw';

	let selectedTab = $state<SearchTab>('formatted');
	let suggestions = $state([]);
	let markedLib = $state(null);

	let isButtonDisabled = $state(false);

	$effect(() => {
		isButtonDisabled = searchQuery.length < 3 || isLoading || isDeepLoading;
	});

	// Update URL function
	function updateURL(query: string) {
		if (browser) {
			const url = new URL(window.location.href);
			if (query) {
				url.searchParams.set('search', query);
			} else {
				url.searchParams.delete('search');
			}
			history.replaceState({}, '', url.toString());
		}
	}

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
				allResults = result.results;
				formattedResults = result.formatted_result;
			} else {
				if (response.status === 401) {
					goto('/auth');
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
				allResults = result.results;
				formattedResults = result.formatted_result;
			} else {
				throw new Error(response.statusText);
			}
		} catch (err) {
			error = 'An error occurred during deep search. Please try again.';
		} finally {
			isDeepLoading = false;
		}
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
		updateURL(searchTerm);

		const response = await fetch(`${Constants.unbornApiUrl}/api/suggestions?q=${searchTerm}`);
		const xmlString = await response.text();
		const parser = new DOMParser();
		const xmlDoc = parser.parseFromString(xmlString, 'application/xml');
		suggestions = Array.from(xmlDoc.getElementsByTagName('suggestion')).map((suggestion) =>
			suggestion.getAttribute('data')
		);
	}

	const cache = new Map<string, any>();

	let viewedHref = $state({ href: '', res: null });

	async function fetchLinkPreview(url: string) {
		// Check if the data is in cache
		if (cache.has(url)) {
			return cache.get(url);
		}

		// If not in cache, fetch the data
		const response = await fetch(`https://api.microlink.io?url=${encodeURIComponent(url)}`);
		const data = await response.json();

		// Store in cache
		cache.set(url, data);

		return data;
	}

	function hoverOnLink(event: MouseEvent) {
		// @ts-ignore
		if (event.target?.href) {
			const linkEl = event.target as HTMLLinkElement;

			tippy(linkEl, {
				async onCreate(instance) {
					try {
						let data: any;

						// Use cached data if available for the same href
						if (viewedHref.href === linkEl.href && viewedHref.res) {
							data = viewedHref.res;
						} else {
							data = await fetchLinkPreview(linkEl.href);
						}

						viewedHref.res = data;
						viewedHref.href = linkEl.href;

						instance.setContent(`
                        <div class="p-4 relative z-10">
                            <img src="${data.data.image.url}" class="w-full h-32 object-cover" />
                            <h3 class="font-bold mt-2">${data.data.title}</h3>
                            <p class="text-sm">${data.data.description}</p>
                        </div>
                    `);
					} catch (err) {
						console.error(err);
					}
				},
				allowHTML: true,
				interactive: true,
				arrow: false,
				onHide() {}
			});
		}
	}

	function clickToPage(e: MouseEvent) {
		if ((e.target as HTMLElement)?.id !== 'searchInput') {
			suggestionsOpen = false;
		}
	}

	function cleanupOldCache(maxAge: number = 1000 * 60 * 60) {
		// Default 1 hour
		const now = Date.now();
		cache.forEach((value, key) => {
			if (now - value.timestamp > maxAge) {
				cache.delete(key);
			}
		});
	}

	$effect(() => {
		document.addEventListener('mousemove', hoverOnLink);
		document.addEventListener('click', clickToPage);

		// Optional: Setup periodic cache cleanup
		const cleanupInterval = setInterval(() => cleanupOldCache(), 1000 * 60 * 30); // Clean every 30 minutes

		return () => {
			document.removeEventListener('mousemove', hoverOnLink);
			document.removeEventListener('click', clickToPage);
			clearInterval(cleanupInterval);
		};
	});

	$effect(() => {
		updateURL(searchQuery);
	});

	// Lifecycle
	$effect(() => {
		const init = async () => {
			try {
				const authToken = localStorage.getItem('authToken');
				if (!authToken) {
					goto('/auth');
					return;
				}

				// Get search query from URL
				const searchParam = $page.url.searchParams.get('search');
				if (searchParam) {
					searchQuery = searchParam;
				}

				const { marked } = await import('marked');
				markedLib = marked;

				try {
					const tippy = (await import('tippy.js')).default;
					if (tippy) tippy('[data-tippy-content]');
				} catch (err) {
					console.log(err);
				}
			} catch (err) {
				console.error(err);
			}
		};

		init();
	});
</script>

<head>
	<title>Scraper</title>
</head>

<div class="min-h-screen w-full bg-black text-gray-100">
	<main class="relative z-10 container mx-auto py-4 sm:py-6 lg:py-8">
		<div class="mx-auto max-w-4xl">
			<h1
				class="main-title animate-fade-in-out mb-4 flex justify-center gap-[0.5rem] border-b-2 border-transparent pb-2 text-center align-middle text-2xl font-bold tracking-tight sm:mb-8 sm:text-3xl"
			>
				<LogoAnimated isLoading={isLoading || isDeepLoading} />
				<AnimatedText text="Scraper" />
			</h1>

			<div class="rounded-xl bg-black px-2 shadow-2xl sm:py-6">
				<form onsubmit={(e) => e.preventDefault()} class="mb-4 sm:mb-6">
					<div class="search-buttons-container flex flex-col gap-3 sm:flex-row">
						<div class="relative flex-1">
							<Textarea
								id="searchInput"
								onkeydown={(e) => {
									if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
										handleSubmit(e, 'quick');
									}
								}}
								onfocus={() => {
									suggestionsOpen = true;
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

							{#if suggestions.length > 0 && suggestionsOpen}
								<div
									class="suggestions w-ful mt-[0.5rem] h-[8rem] max-h-[8rem] overflow-y-scroll rounded-md border border-slate-700 p-1"
								>
									{#each suggestions as suggestion, idx}
										<Button
											variant="ghost"
											onclick={(e) => {
												e.stopPropagation();
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
								data-tippy-content="Quick Search performs parallel searches across Bing, and DuckDuckGo, combining results and using AI to format them into a comprehensive summary."
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
								data-tippy-content="Deep Search performs an extensive DuckDuckGo search, recursively analyzing all inner links to gather comprehensive information."
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

				{#if !formattedResults && !error && !(isLoading || isDeepLoading)}
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
				{:else if formattedResults}
					<div class="flex gap-2 align-middle">
						<Button
							size="sm"
							variant={selectedTab === 'formatted' ? 'secondary' : 'ghost'}
							class="relative max-sm:w-full"
							onclick={() => (selectedTab = 'formatted')}
							disabled={isButtonDisabled}
						>
							Formatted
						</Button>

						<Button
							size="sm"
							variant={selectedTab !== 'formatted' ? 'secondary' : 'ghost'}
							class="relative max-sm:w-full"
							onclick={() => (selectedTab = 'raw')}
							disabled={isButtonDisabled}
						>
							Raw
						</Button>
					</div>
					{#if selectedTab === 'formatted'}
						<div
							class="markdown prose prose-invert my-4 max-w-none space-y-4 text-sm sm:my-6 sm:text-base"
						>
							{@html markedLib?.(formattedResults)?.replace(
								/<a /g,
								'<a target="_blank" rel="noopener noreferrer" '
							)}
						</div>
					{/if}
					{#if selectedTab === 'raw'}
						<div class="my-5 space-y-6">
							{#each allResults as result}
								<div
									class="relative rounded-sm border border-gray-200 bg-white p-6 shadow-sm backdrop-blur-2xl transition-shadow hover:z-10 hover:shadow-md dark:border-gray-700 dark:bg-gray-800/40"
								>
									<div class="flex items-start justify-between">
										<div class="flex-1">
											<!-- Source URL -->
											<div class="mb-1 text-sm text-gray-600 dark:text-gray-400">
												{result.source}
											</div>

											<!-- Title with link -->
											<a
												href={result.link}
												target="_blank"
												rel="noopener noreferrer"
												class="mb-2 block text-xl font-semibold text-blue-600 hover:underline dark:text-blue-400"
											>
												{result.title}
											</a>

											<!-- Snippet -->
											<p class="text-gray-700 dark:text-gray-300">
												{result?.snippet}
											</p>
										</div>

										<!-- Info button with tooltip -->
										{#if result.inner_content}
											<!-- svelte-ignore a11y_consider_explicit_label -->
											<button
												class="ml-4 rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
												use:tippy={{
													content: result.inner_content,
													allowHTML: true,
													interactive: true,
													theme: 'custom',
													placement: 'right',
													maxWidth: 300
												}}
											>
												<svg
													xmlns="http://www.w3.org/2000/svg"
													class="h-5 w-5"
													viewBox="0 0 20 20"
													fill="currentColor"
												>
													<path
														fill-rule="evenodd"
														d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
														clip-rule="evenodd"
													/>
												</svg>
											</button>
										{/if}
									</div>
								</div>
							{/each}
						</div>
					{/if}
				{/if}
			</div>
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
