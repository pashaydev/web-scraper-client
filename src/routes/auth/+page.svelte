<!-- svelte-ignore event_directive_deprecated -->
<!-- svelte-ignore a11y_no_static_element_interactions -->
<!-- svelte-ignore a11y_click_events_have_key_events -->

<script lang="ts">
	import 'tippy.js/dist/tippy.css';

	import AnimatedText from '../../components/ui/animated-text.svelte';
	import Button from '../../components/ui/button.svelte';
	import Input from '../../components/ui/input.svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { Constants } from '$lib/constants';

	let selectedType = $state('login');
	let alert = $state({ type: '', message: '' });

	let loginForm = $state({
		username: '',
		password: ''
	});

	let signupForm = $state({
		name: '',
		semail: '',
		spassword: '',
		srepeatPassword: ''
	});

	let isLoading = $state(false);

	function showAlert(type, message) {
		alert = { type, message };
		setTimeout(() => (alert = { type: '', message: '' }), 3000);
	}

	function handleLoginChange(e) {
		console.log(e);

		loginForm = {
			...loginForm,
			[e.target.id]: e.target.value
		};
	}

	function handleSignupChange(e) {
		signupForm = {
			...signupForm,
			[e.target.id]: e.target.value
		};
	}

	async function handleLogin(e) {
		e.preventDefault();
		try {
			isLoading = true;
			const response = await fetch(`${Constants.apiUrl}/api/login`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(loginForm)
			});

			const data = await response.json();

			if (!response.ok) throw new Error(data.message || 'Login failed');

			localStorage.setItem('authToken', data.token);

			showAlert('success', 'Successfully logged in!');

			loginForm = { username: '', password: '' };

			goto('/');

			isLoading = false;
		} catch (error) {
			isLoading = false;
			showAlert('error', error.message);
		}
	}

	async function handleSignup(e) {
		e.preventDefault();

		if (signupForm.name.trim().length === 0) {
			showAlert('error', 'Name are requeued');
			return;
		}

		if (signupForm.spassword.trim().length === 0) {
			showAlert('error', 'Password are requeued');
			return;
		}

		if (signupForm.srepeatPassword.trim().length === 0) {
			showAlert('error', 'Password are requeued');
			return;
		}

		if (signupForm.spassword !== signupForm.srepeatPassword) {
			showAlert('error', 'Passwords do not match');
			return;
		}

		try {
			isLoading = true;
			const response = await fetch(`${Constants.apiUrl}/api/signup`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					username: signupForm.name,
					email: signupForm.semail,
					password: signupForm.spassword,
					repeatPassword: signupForm.spassword
				})
			});

			const data = await response.json();

			if (!response.ok) throw new Error(data.message || 'Signup failed');

			localStorage.setItem('authToken', data.token);
			showAlert('success', 'Account created successfully!');
			signupForm = { name: '', semail: '', spassword: '', srepeatPassword: '' };
			goto('/');
			isLoading = false;
		} catch (error) {
			showAlert('error', error.message);
			isLoading = false;
		}
	}

	onMount(async () => {
		const UnicornStudio = await import('../../lib/unicorn-studio.js');

		UnicornStudio.default
			.addScene({
				elementId: 'unicornContainer', // id of the HTML element to render your scene in (the scene will use its dimensions)
				fps: 120, // frames per second (0-120) [optional]
				scale: 1, // rendering scale, use smaller values for performance boost (0.25-1) [optional]
				dpi: 1, // pixel ratio [optional]
				// projectId: "0CvnN1baGBDCrjtubj7u", // the id string for your embed (get this from "embed" export)
				lazyLoad: true, // will not initialize the scene until it scrolls into view
				filePath: '/animation.json', // if youre hosting your own exported json code, point to it here (do not use both filePath and projectId, only one is required)
				production: false, // when true, will hit the global edge CDN, learn more in the help docs
				interactivity: {
					// [optional]
					mouse: {
						disableMobile: true // disable touch movement on mobile
					}
				}
			})
			.then((scene) => {
				// scene is ready
				// To remove a scene, you can use:
				// scene.destroy()
			})
			.catch((err) => {
				console.error(err);
			});

		try {
			const tippy = (await import('tippy.js')).default;
			if (tippy) tippy('[data-tippy-content]');
		} catch (err) {
			console.log(err);
		}
	});

	async function handleGoogleLogin(e) {
		try {
			e.stopPropagation();
			// Redirect to backend OAuth endpoint
			window.location.href = `${Constants.apiUrl}/auth/google`;
		} catch (err) {
			console.error(err);
		}
	}

	async function handleGithubLogin(e) {
		try {
			e.stopPropagation();
			// Redirect to backend OAuth endpoint
			window.location.href = `${Constants.apiUrl}/auth/github`;
		} catch (err) {
			console.error(err);
		}
	}
</script>

<head>
	<title>Authentication</title>
</head>

<div style={{ cursor: isLoading ? 'wait' : '' }} class="min-h-screen w-full bg-black text-gray-100">
	<!-- <div
        id="unicornContainer"
        class="unicorn-embed"
        data-us-project="0CvnN1baGBDCrjtubj7u"
        data-us-project-src="./animation.json"
        data-us-scale="1"
        data-us-dpi="1.5"
        data-us-lazyload="true"
        data-us-disableMobile="true"
        data-us-alttext="Welcome to Unicorn Studio"
        data-us-arialabel="This is a canvas scene"
    ></div> -->
	<!-- <div id="unicornContainer" class="unicorn-embed"></div> -->
	<div
		id="unicornContainer"
		class="absolute top-0 left-0 z-0 h-full w-full"
		style="width: 100%; height: 100%"
	></div>

	<main class="relative z-10 container mx-auto h-screen px-4 py-5">
		<div class="mx-auto flex h-full max-w-md flex-col justify-end">
			<h1 class="mb-8 text-center text-3xl font-bold tracking-tight text-white">
				<AnimatedText text="Authentication"></AnimatedText>
			</h1>

			<div class="rounded-xl bg-black p-6 shadow-2xl">
				<!-- Login Form -->

				<div
					on:focusin={() => {
						selectedType = 'login';
					}}
					on:focus={() => {
						selectedType = 'login';
					}}
					on:mouseenter={() => (selectedType = 'login')}
					class="mb-8 {selectedType === 'login' ? '' : 'opacity-30'}"
				>
					<h2 class="mb-6 text-xl font-semibold text-gray-100">Login</h2>
					<form on:submit={handleLogin} class="wspace-y-4 mt-auto flex flex-col gap-4">
						<Input
							title="Username"
							id="username"
							type="text"
							value={loginForm.username}
							oninput={handleLoginChange}
							placeholder="Enter your username"
							autocomplete="username"
						/>
						<Input
							title="Password"
							id="password"
							type="password"
							value={loginForm.password}
							oninput={handleLoginChange}
							placeholder="Enter your password"
							autocomplete="current-password"
						/>
						<Button
							disabled={isLoading}
							type="submit"
							class="w-full rounded-lg bg-blue-600 px-6 py-3 text-white 
                transition-all duration-200 hover:bg-blue-500 
                focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
                focus:ring-offset-slate-800 focus:outline-none"
						>
							Login
						</Button>
					</form>

					<div class="mt-4 flex w-full justify-end gap-2">
						<Button
							data-tippy-content="Login using github provider"
							onclick={handleGithubLogin}
							variant="ghost"
							size="sm"
						>
							<img class="h-[1rem] w-[1rem]" src="/github-mark.svg" alt="github logo" />
						</Button>
						<Button
							data-tippy-content="Login using google provider"
							onclick={handleGoogleLogin}
							variant="ghost"
							size="sm"
						>
							<img class="h-[1rem] w-[1rem]" src="/google-mark.svg" alt="google logo" />
						</Button>
					</div>
				</div>

				<!-- Divider -->
				<div class="relative mt-6 mb-3">
					<div class="absolute inset-0 flex items-center">
						<div class="w-full border-t border-slate-600"></div>
					</div>
					<div class="relative flex justify-center text-sm">
						<span class="bg-slate-800 px-2 text-gray-400">Or</span>
					</div>
				</div>

				<!-- Sign Up Form -->
				<div
					on:focusin={() => {
						selectedType = 'signup';
					}}
					on:focus={() => {
						selectedType = 'signup';
					}}
					on:mouseenter={() => (selectedType = 'signup')}
					class={selectedType === 'signup' ? '' : 'opacity-30'}
				>
					<h2 class="mb-6 text-xl font-semibold text-gray-100">SignUp</h2>
					<form on:submit={handleSignup} class="space-y-4">
						<Input
							title="Username"
							id="name"
							type="text"
							value={signupForm.name}
							oninput={handleSignupChange}
							placeholder="Enter your username"
							autocomplete="username"
						/>
						<Input
							title="Email"
							id="semail"
							type="email"
							value={signupForm.semail}
							oninput={handleSignupChange}
							placeholder="Enter your email"
							autocomplete="email"
						/>
						<Input
							title="Password"
							id="spassword"
							type="password"
							value={signupForm.spassword}
							oninput={handleSignupChange}
							placeholder="Enter your password"
							autocomplete="new-password"
						/>
						<Input
							title="Repeat Password"
							id="srepeatPassword"
							type="password"
							value={signupForm.srepeatPassword}
							oninput={handleSignupChange}
							placeholder="Repeat password"
							autocomplete="new-password"
						/>
						<Button
							disabled={isLoading}
							type="submit"
							class="w-full rounded-lg bg-purple-600 px-6 py-3 text-white
                transition-all duration-200 hover:bg-purple-500
                focus:ring-2 focus:ring-purple-500 focus:ring-offset-2
                focus:ring-offset-slate-800 focus:outline-none"
						>
							Create Account
						</Button>
					</form>
				</div>
			</div>
		</div>
	</main>

	{#if alert.message}
		<div
			class="fixed top-4 left-4 z-10 mb-4 rounded-lg border p-4
          {alert.type === 'success' ? 'border-green-700 bg-green-900/50 text-green-300' : ''}
          {alert.type === 'error' ? 'border-red-700 bg-red-900/50 text-red-300' : ''}"
			on:click={() => (alert = { type: '', message: '' })}
		>
			{alert.message}
		</div>
	{/if}
</div>
