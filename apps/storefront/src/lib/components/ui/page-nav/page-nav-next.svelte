<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { page } from '$app/state'
	import { buttonVariants } from '$lib/components/ui/button/index.js'
	import { getPageNavContext } from './page-nav-ctx.svelte.js'
	import { buildPageHref } from './page-nav-logic.js'
	import type { Snippet } from 'svelte'

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getPageNavContext()
	const disabled = $derived(ctx.page >= ctx.pageCount - 1)
	const href = $derived(buildPageHref(page.url, ctx.pageParam, ctx.page + 1))
</script>

{#if disabled}
	<span data-page-nav-next aria-disabled="true" class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'pointer-events-none opacity-50', className)}
		>{#if children}{@render children()}{:else}Next{/if}</span
	>
{:else}
	<a data-page-nav-next {href} rel="next" aria-label="Next page" class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), className)}
		>{#if children}{@render children()}{:else}Next{/if}</a
	>
{/if}
