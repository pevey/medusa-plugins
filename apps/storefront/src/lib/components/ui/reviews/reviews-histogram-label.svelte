<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getHistogramLevelContext } from './reviews-ctx.svelte.js'
	let { class: className = '' }: { class?: string } = $props()
	const lvl = getHistogramLevelContext()
</script>

<span class={cn('w-10 text-sm', className)}>{lvl.level} star</span>
