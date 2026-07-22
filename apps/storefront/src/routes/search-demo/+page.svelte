<script lang="ts">
	import * as Search from '$lib/components/ui/search'
	import SearchBox from '$lib/components/ui/search/search-box.svelte'
	import SearchDialog from '$lib/components/ui/search/search-dialog.svelte'
	import ThemeButton from '$lib/components/ui/theme/theme-button.svelte'
	import ThemeToggle from '$lib/components/ui/theme/theme-toggle.svelte'
	import Sparkles from '@lucide/svelte/icons/sparkles'
	import SearchIcon from '@lucide/svelte/icons/search'
</script>

<div class="mx-auto max-w-3xl space-y-16 p-8" data-testid="search-demo">
	<div class="flex flex-wrap items-center gap-6" data-testid="theme-switchers">
		<ThemeButton />
		<ThemeToggle />
	</div>

	<!-- Command palette. Press Ctrl/Cmd+K anywhere, or click the trigger. -->
	<section data-testid="search-dialog">
		<h2 class="mb-4 text-lg font-semibold">Search Dialog — Ctrl/⌘K command palette</h2>
		<SearchDialog>
			{#snippet trigger(open)}
				<button
					onclick={open}
					class="border-input text-muted-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
				>
					<SearchIcon class="size-4" />
					<span>Search…</span>
					<kbd
						class="bg-muted text-muted-foreground ml-4 rounded border px-1.5 py-0.5 font-mono text-xs"
					>
						⌘K
					</kbd>
				</button>
			{/snippet}
		</SearchDialog>
	</section>

	<!-- Drop-in preset (default breakpoint). Resize the window below `md` to see the collapse. -->
	<section data-testid="search-box-default">
		<h2 class="mb-4 text-lg font-semibold">Search Box — drop-in preset</h2>
		<SearchBox searchUrl="/search-demo" />
	</section>

	<!-- Hand-composed compound primitives. -->
	<section data-testid="search-compound">
		<h2 class="mb-4 text-lg font-semibold">Compound — hand-composed</h2>
		<Search.Root class="w-full max-w-xl">
			<Search.Input placeholder="Search products…" />
			<Search.Results />
		</Search.Root>
	</section>

	<!-- Full-page (static) results list — what a `searchUrl` page uses. -->
	<section data-testid="search-static">
		<h2 class="mb-4 text-lg font-semibold">Static — full search-page layout</h2>
		<Search.Root class="w-full">
			<Search.Input placeholder="Search…" />
			<Search.Results static />
		</Search.Root>
	</section>

	<!-- Custom hit snippet. -->
	<section data-testid="search-custom-hit">
		<h2 class="mb-4 text-lg font-semibold">Custom hit rendering</h2>
		<Search.Root class="w-full max-w-xl">
			<Search.Input placeholder="Search…" />
			<Search.Results>
				{#snippet hit(h)}
					<a href={`/products/${h.slug}`} class="block p-4 hover:bg-accent">
						<strong>{h.title}</strong> — <span class="text-muted-foreground">{h.type}</span>
					</a>
				{/snippet}
			</Search.Results>
		</Search.Root>
	</section>

	<!-- Swapped icon snippet. -->
	<section data-testid="search-custom-icon">
		<h2 class="mb-4 text-lg font-semibold">Swapped icon</h2>
		<Search.Root class="w-full max-w-xl">
			<Search.Input placeholder="Search…">
				{#snippet icon()}
					<Sparkles class="size-4" />
				{/snippet}
			</Search.Input>
			<Search.Results />
		</Search.Root>
	</section>
</div>
