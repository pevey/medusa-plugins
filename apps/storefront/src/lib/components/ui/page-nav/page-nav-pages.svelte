<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { page } from '$app/state'
	import { buttonVariants, type ButtonSize, type ButtonVariant } from '$lib/components/ui/button/index.js'
	import { getPageNavContext } from './page-nav-ctx.svelte.js'
	import { buildPageHref, pageWindow } from './page-nav-logic.js'

	let {
		class: className = '',
		span = 1,
		variant = 'ghost',
		activeVariant = 'outline',
		size = 'sm'
	}: { class?: string; span?: number; variant?: ButtonVariant; activeVariant?: ButtonVariant; size?: ButtonSize } = $props()
	const ctx = getPageNavContext()
	const items = $derived(pageWindow(ctx.page, ctx.pageCount, span))
</script>

{#each items as item, i (item === 'ellipsis' ? `e${i}` : item)}
	{#if item === 'ellipsis'}
		<span data-page-nav-ellipsis aria-hidden="true" class="px-2">…</span>
	{:else}
		<a
			data-page-nav-page={item}
			href={buildPageHref(page.url, ctx.pageParam, item)}
			aria-label={`Page ${item + 1}`}
			aria-current={item === ctx.page ? 'page' : undefined}
			class={cn(buttonVariants({ variant: item === ctx.page ? activeVariant : variant, size }), className)}>{item + 1}</a
		>
	{/if}
{/each}
