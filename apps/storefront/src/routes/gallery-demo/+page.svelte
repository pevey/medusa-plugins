<script lang="ts">
	import { getProduct } from 'sveltekit-medusa-sdk'
	import * as Gallery from '$lib/components/ui/gallery'
	import Gallery1 from '$lib/components/ui/gallery/gallery1.svelte'
	import Gallery2 from '$lib/components/ui/gallery/gallery2.svelte'
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

			<!-- ── Presets (drop-in) ───────────────────────────────────────── -->

			<section data-testid="gallery1-bottom">
				<h2 class="mb-4 text-lg font-semibold">Gallery1 — bottom thumbnails (default)</h2>
				<Gallery1 {images} alt={product.title} />
			</section>

			<section data-testid="gallery1-left">
				<h2 class="mb-4 text-lg font-semibold">Gallery1 — left thumbnails, sm breakpoint</h2>
				<Gallery1 {images} thumbnails="left" thumbnailBreakpoint="sm" alt={product.title} />
			</section>

			<section data-testid="gallery2-zoom">
				<h2 class="mb-4 text-lg font-semibold">Gallery2 — right thumbnails + click-to-zoom</h2>
				<Gallery2 {images} thumbnails="right" alt={product.title} />
			</section>

			<!-- ── Compound primitives (composition + per-part class) ──────── -->

			<section data-testid="compound">
				<h2 class="mb-4 text-lg font-semibold">Compound — hand-composed primitives</h2>
				<Gallery.Root {images} alt={product.title} class="flex-row">
					<Gallery.Thumbnails class="hidden w-20 md:flex" orientation="vertical">
						<Gallery.ThumbnailImage />
					</Gallery.Thumbnails>
					<div class="flex min-w-0 flex-1 flex-col">
						<Gallery.Carousel><Gallery.Image /></Gallery.Carousel>
						<Gallery.Dots class="mt-3 flex md:hidden" />
					</div>
				</Gallery.Root>
			</section>

			<!-- ── Documented examples ─────────────────────────────────────── -->

			<!-- 1. Basic: minimum props. -->
			<section data-testid="example-basic">
				<h2 class="mb-4 text-lg font-semibold">Example: Basic (minimum props)</h2>
				<Gallery1 {images} />
			</section>

			<!-- 2. Styling: per-part class (no snippet, no custom vars). Size via Root class,
			     image aspect/fit/radius via Gallery.Image class. -->
			<section data-testid="example-styling">
				<h2 class="mb-4 text-lg font-semibold">Example: Styling (per-part class)</h2>
				<Gallery.Root {images} alt={product.title} class="max-w-md">
					<Gallery.Carousel>
						<Gallery.Image class="aspect-square w-full rounded-xl object-cover" />
					</Gallery.Carousel>
					<Gallery.Dots class="mt-3 flex" />
				</Gallery.Root>
			</section>

			<!-- 3. Autoplay: embla plugin + opts passthrough. -->
			<section data-testid="example-autoplay">
				<h2 class="mb-4 text-lg font-semibold">Example: Autoplay (embla plugin)</h2>
				<Gallery1
					{images}
					alt={product.title}
					opts={{ loop: true }}
					plugins={[Autoplay({ delay: 2500 })]}
				/>
			</section>

			<!-- 4. Pointer: first-class bind:selectedIndex. -->
			<section data-testid="example-pointer">
				<h2 class="mb-4 text-lg font-semibold">Example: Pointer (bind selected image)</h2>
				<Gallery1 {images} alt={product.title} bind:selectedIndex />
				<p class="mt-3 text-sm text-muted-foreground" data-testid="pointer-readout">
					Selected image: {selectedIndex + 1} / {images.length}
				</p>
			</section>
		{:else}
			<p>Product with slug "test" not found.</p>
		{/if}
	{/await}
</div>
