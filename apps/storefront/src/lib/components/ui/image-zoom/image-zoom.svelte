<!--
  Vendored from more-shadcn-svelte (https://github.com/kevwpl/more-shadcn-svelte).
  Copyright (c) 2025 kevwpl — MIT License. See README credits for the full notice.
-->
<script lang="ts">
	import { writable } from 'svelte/store';
	import { setImageZoomContext, type ZoomImageData } from './ctx';
	import { fade } from 'svelte/transition';
	import { type Snippet } from 'svelte';
	import { Button } from '$lib/components/ui/button';
	import { X, ChevronLeft, ChevronRight } from '@lucide/svelte';
	import { cn } from '$lib/utils.js';

	let {
		class: className,
		children
	}: {
		class?: string;
		children?: Snippet;
	} = $props();

	const registeredImagesStore = writable<ZoomImageData[]>([]);
	const currentImageIndexStore = writable<number | null>(null);
	const openStore = writable(false);

	let registeredImages = $state<ZoomImageData[]>([]);
	let currentImageIndex = $state<number | null>(null);
	let isOpen = $state(false);

	$effect(() => {
		registeredImages = $registeredImagesStore;
		currentImageIndex = $currentImageIndexStore;
		isOpen = $openStore;
	});

	const currentImageData = $derived(
		currentImageIndex !== null ? registeredImages[currentImageIndex] : null
	);
	const hasMultipleImages = $derived(registeredImages.length > 1);
	const hasPrevious = $derived(currentImageIndex !== null && currentImageIndex > 0);
	const hasNext = $derived(
		currentImageIndex !== null && currentImageIndex < registeredImages.length - 1
	);

	function registerImage(imageData: Omit<ZoomImageData, 'index'>) {
		const index = $registeredImagesStore.length;
		$registeredImagesStore = [...$registeredImagesStore, { ...imageData, index }];
		return index;
	}

	function openImage(index: number) {
		$currentImageIndexStore = index;
		$openStore = true;
	}

	function nextImage() {
		if (currentImageIndex !== null && hasNext) {
			$currentImageIndexStore = currentImageIndex + 1;
		}
	}

	function prevImage() {
		if (currentImageIndex !== null && hasPrevious) {
			$currentImageIndexStore = currentImageIndex - 1;
		}
	}

	function closeZoom() {
		$openStore = false;
		$currentImageIndexStore = null;
	}

	setImageZoomContext({
		registeredImages: registeredImagesStore,
		currentImageIndex: currentImageIndexStore,
		open: openStore,
		registerImage,
		openImage,
		nextImage,
		prevImage
	});

	function handleKeydown(event: KeyboardEvent) {
		if (!isOpen) return;
		if (event.key === 'Escape') closeZoom();
		if (event.key === 'ArrowLeft') prevImage();
		if (event.key === 'ArrowRight') nextImage();
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if isOpen && currentImageData}
	<div
		class={cn('fixed inset-0 z-[10000] flex items-center justify-center bg-black/90', className)}
		transition:fade={{ duration: 150 }}
		aria-modal="true"
		role="dialog"
		tabindex="-1"
	>
		<button type="button" class="absolute inset-0 cursor-default" onclick={closeZoom} aria-label="Close"></button>

		<div
			class="relative flex max-h-[90vh] max-w-[90vw] items-center justify-center pointer-events-none"
		>
			<img
				src={currentImageData.src}
				alt={currentImageData.alt}
				class="block max-h-full max-w-full object-contain pointer-events-auto"
				transition:fade={{ duration: 300, delay: 50 }}
			/>
		</div>

		{#if hasMultipleImages}
			<Button
				variant="ghost"
				size="icon"
				class="absolute left-4 top-1/2 -translate-y-1/2 cursor-pointer text-white pointer-events-auto hover:bg-primary hover:text-gray-300 disabled:pointer-events-none disabled:opacity-30"
				onclick={prevImage}
				disabled={!hasPrevious}
				aria-label="Previous image"
			>
				<ChevronLeft class="h-8 w-8" />
			</Button>

			<Button
				variant="ghost"
				size="icon"
				class="absolute right-4 top-1/2 -translate-y-1/2 cursor-pointer text-white pointer-events-auto hover:bg-primary hover:text-gray-300 disabled:pointer-events-none disabled:opacity-30"
				onclick={nextImage}
				disabled={!hasNext}
				aria-label="Next image"
			>
				<ChevronRight class="h-8 w-8" />
			</Button>
		{/if}

		<Button
			variant="ghost"
			size="icon"
			class="absolute right-4 top-4 cursor-pointer text-white pointer-events-auto hover:bg-primary hover:text-gray-300"
			onclick={closeZoom}
			aria-label="Close zoomed image"
		>
			<X class="h-6 w-6" />
		</Button>
	</div>
{/if}

{@render children?.()}
