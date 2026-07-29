<script lang="ts">
	import { cn } from '$lib/utils.js'
	import type { Snippet } from 'svelte'
	let { class: className = '', children }: { class?: string; children?: Snippet } = $props()
</script>

<h2 class={cn('text-2xl font-semibold', className)}>
	{#if children}{@render children()}{:else}Customer Reviews{/if}
</h2>
