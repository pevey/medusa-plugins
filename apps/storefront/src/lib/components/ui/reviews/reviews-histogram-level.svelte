<script lang="ts">
	import { getReviewsContext, setHistogramLevelContext } from './reviews-ctx.svelte.js'
	import { barFill } from './reviews-logic.js'
	import type { Snippet } from 'svelte'
	let { level, orientation, children }: { level: number; orientation: 'horizontal' | 'vertical'; children: Snippet } = $props()
	const ctx = getReviewsContext()
	setHistogramLevelContext({
		get level() {
			return level
		},
		get count() {
			return ctx.summary?.distribution?.[level as 1 | 2 | 3 | 4 | 5] ?? 0
		},
		get fill() {
			return barFill(ctx.summary?.distribution?.[level as 1 | 2 | 3 | 4 | 5] ?? 0, ctx.count)
		},
		get active() {
			return ctx.rating === level
		},
		get orientation() {
			return orientation
		},
		select: () => ctx.setRating(level)
	})
</script>

{@render children()}
