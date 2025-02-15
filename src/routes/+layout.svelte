<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import HeroSketch from '../components/three.js/HeroSketch';
	import '../app.css';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';

	let { children } = $props();

	let canvasRef: HTMLCanvasElement | null = $state(null);
	let heroSketchRef: HeroSketch | null = $state(null);

	const handleResize = () => {
		if (window.innerWidth < 756 || $page.url.pathname === '/auth') {
			if (heroSketchRef) {
				heroSketchRef.dispose();
				heroSketchRef = null;
			}
		} else {
			if (!heroSketchRef && canvasRef) {
				heroSketchRef = new HeroSketch(canvasRef);
			}
		}
	};

	function logout() {
		// Clear all auth-related data
		localStorage.removeItem('token');
		localStorage.removeItem('user');
		// Any other auth-related cleanup

		// Redirect to login page or home page
		window.location.href = '/auth';
	}

	onMount(() => {
		if (browser) {
			window.addEventListener('resize', handleResize);
		}
		handleResize();
	});

	onDestroy(() => {
		if (browser) {
			window.removeEventListener('resize', handleResize);
		}
		if (heroSketchRef) heroSketchRef.dispose();
	});
</script>

<canvas
	bind:this={canvasRef}
	class="pointer-events-none fixed top-0 right-0 bottom-0 left-0 z-0 h-full w-full"
></canvas>

{@render children()}
