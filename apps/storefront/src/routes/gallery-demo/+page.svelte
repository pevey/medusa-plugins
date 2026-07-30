<script lang="ts">
	import { getProduct } from 'sveltekit-medusa-sdk'
	import * as Gallery from '$lib/components/ui/gallery'
	import Autoplay from 'embla-carousel-autoplay'
	import ThemeButton from '$lib/components/ui/theme/theme-button.svelte'
	import ThemeToggle from '$lib/components/ui/theme/theme-toggle.svelte'
	import ThemeSwitch from '$lib/components/ui/theme/theme-switch.svelte'
	import ThemeSelect from '$lib/components/ui/theme/theme-select.svelte'

	// Pointer example: first-class two-way binding to the selected image index.
	let selectedIndex = $state(0)
</script>

<div class="mx-auto max-w-3xl space-y-16 p-8" data-testid="gallery-demo">
	<!-- Theme switchers — flip the theme to preview the gallery in light/dark. -->
	<div class="flex flex-wrap items-center gap-6" data-testid="theme-switchers">
		<ThemeButton />
		<ThemeToggle />
		<ThemeSwitch />
		<ThemeSelect />
	</div>

	{#await getProduct({ slug: 'test' })}
		<p>Loading…</p>
	{:then product}
		{#if product}
			{@const images = product.images ?? []}
			<h1 class="text-2xl font-bold">{product.title}</h1>

			<!--
				One compound `Gallery.Root`. Layout is composed with the parts; behavior is tuned
				with props (`thumbnails`, `thumbnailBreakpoint`, `zoom`) that Root publishes to the
				parts. There are no `gallery1`/`gallery2` presets any more.
			-->

			<!-- Bottom thumbnails (default): rail on desktop, dots on mobile. -->
			<section data-testid="gallery-bottom">
				<h2 class="mb-4 text-lg font-semibold">Bottom thumbnails (default)</h2>
				<Gallery.Root {images} alt={product.title}>
					<Gallery.Thumbnails><Gallery.ThumbnailImage /></Gallery.Thumbnails>
					<Gallery.Main>
						<Gallery.Carousel><Gallery.Image /></Gallery.Carousel>
						<Gallery.Dots class="mt-3" />
					</Gallery.Main>
				</Gallery.Root>
			</section>

			<!-- Left rail, swapping to dots below the `sm` breakpoint. -->
			<section data-testid="gallery-left">
				<h2 class="mb-4 text-lg font-semibold">Left thumbnails, sm breakpoint</h2>
				<Gallery.Root {images} thumbnails="left" thumbnailBreakpoint="sm" alt={product.title}>
					<Gallery.Thumbnails><Gallery.ThumbnailImage /></Gallery.Thumbnails>
					<Gallery.Main>
						<Gallery.Carousel><Gallery.Image /></Gallery.Carousel>
						<Gallery.Dots class="mt-3" />
					</Gallery.Main>
				</Gallery.Root>
			</section>

			<!-- Right rail + click-to-zoom: `zoom` makes Gallery.Image render zoom triggers. -->
			<section data-testid="gallery-zoom">
				<h2 class="mb-4 text-lg font-semibold">Right thumbnails + click-to-zoom</h2>
				<Gallery.Root {images} thumbnails="right" zoom alt={product.title}>
					<Gallery.Thumbnails><Gallery.ThumbnailImage /></Gallery.Thumbnails>
					<Gallery.Main>
						<Gallery.Carousel><Gallery.Image /></Gallery.Carousel>
						<Gallery.Dots class="mt-3" />
					</Gallery.Main>
				</Gallery.Root>
			</section>

			<!-- Styling: no rail, per-part image class (aspect/fit/radius). -->
			<section data-testid="example-styling">
				<h2 class="mb-4 text-lg font-semibold">Styling (per-part class)</h2>
				<Gallery.Root {images} thumbnails="none" alt={product.title} class="max-w-md">
					<Gallery.Main>
						<Gallery.Carousel>
							<Gallery.Image class="aspect-square w-full rounded-xl object-cover" />
						</Gallery.Carousel>
						<Gallery.Dots class="mt-3" />
					</Gallery.Main>
				</Gallery.Root>
			</section>

			<!-- Autoplay: embla plugin + opts passthrough via Root. -->
			<section data-testid="example-autoplay">
				<h2 class="mb-4 text-lg font-semibold">Autoplay (embla plugin)</h2>
				<Gallery.Root {images} alt={product.title} opts={{ loop: true }} plugins={[Autoplay({ delay: 2500 })]}>
					<Gallery.Thumbnails><Gallery.ThumbnailImage /></Gallery.Thumbnails>
					<Gallery.Main>
						<Gallery.Carousel><Gallery.Image /></Gallery.Carousel>
						<Gallery.Dots class="mt-3" />
					</Gallery.Main>
				</Gallery.Root>
			</section>

			<!-- Pointer: first-class bind:selectedIndex. -->
			<section data-testid="example-pointer">
				<h2 class="mb-4 text-lg font-semibold">Pointer (bind selected image)</h2>
				<Gallery.Root {images} alt={product.title} bind:selectedIndex>
					<Gallery.Thumbnails><Gallery.ThumbnailImage /></Gallery.Thumbnails>
					<Gallery.Main>
						<Gallery.Carousel><Gallery.Image /></Gallery.Carousel>
						<Gallery.Dots class="mt-3" />
					</Gallery.Main>
				</Gallery.Root>
				<p class="mt-3 text-sm text-muted-foreground" data-testid="pointer-readout">
					Selected image: {selectedIndex + 1} / {images.length}
				</p>
			</section>
		{:else}
			<p>Product with slug "test" not found.</p>
		{/if}
	{/await}
</div>
