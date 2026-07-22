<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const ctx = getProductContext()
</script>

<h1 class={cn('text-2xl font-semibold', className)}>{ctx.product?.title}</h1>
