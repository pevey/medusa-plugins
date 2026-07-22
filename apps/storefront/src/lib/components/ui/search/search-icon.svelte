<script lang="ts">
	import SearchIcon from '@lucide/svelte/icons/search'
	import { cn } from '$lib/utils.js'
	import type { Snippet } from 'svelte'

	interface Props {
		class?: string
		children?: Snippet
	}
	let { class: className = '', children }: Props = $props()
</script>

{#if children}
	{@render children()}
{:else}
	<SearchIcon class={cn('size-5', className)} />
{/if}
