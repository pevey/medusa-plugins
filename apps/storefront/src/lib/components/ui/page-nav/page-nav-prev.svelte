<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { page } from '$app/state'
	import { buttonVariants } from '$lib/components/ui/button/index.js'
	import { getPageNavContext } from './page-nav-ctx.svelte.js'
	import { buildPageHref } from './page-nav-logic.js'
	import type { Snippet } from 'svelte'

	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
	const ctx = getPageNavContext()
	const disabled = $derived(ctx.page <= 0)
	const href = $derived(buildPageHref(page.url, ctx.pageParam, ctx.page - 1))
</script>

{#if disabled}
	<span data-page-nav-prev aria-disabled="true" class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), 'pointer-events-none opacity-50', className)}
		>{#if children}{@render children()}{:else}Previous{/if}</span
	>
{:else}
	<a data-page-nav-prev {href} rel="prev" aria-label="Previous page" class={cn(buttonVariants({ variant: 'ghost', size: 'sm' }), className)}
		>{#if children}{@render children()}{:else}Previous{/if}</a
	>
{/if}
