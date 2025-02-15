<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		const params = new URLSearchParams(window.location.search);
		const token = params.get('token');

		if (token) {
			// Store the token
			localStorage.setItem('authToken', token);

			// Redirect to home page
			goto('/');
		}
	});
</script>

<div class="flex h-screen items-center justify-center">
	<p>Authentication successful! Redirecting...</p>
</div>
