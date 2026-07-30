<script lang="ts">
	import { cn } from '$lib/utils.js'
	let { fill = 0, class: className = '' }: { fill?: number; class?: string } = $props()
	const uid = $props.id()
	const gradId = `star-${uid}`
	const pct = $derived(`${Math.max(0, Math.min(1, fill)) * 100}%`)
</script>

<svg
	class={cn('inline-block h-5 w-5 flex-shrink-0 text-yellow-400', className)}
	viewBox="0 0 24 24"
	fill="none"
	stroke="currentColor"
	stroke-width="2"
	stroke-linecap="round"
	stroke-linejoin="round"
	aria-hidden="true"
>
	<defs>
		<linearGradient id={gradId}>
			<stop offset={pct} stop-color="currentColor" />
			<stop offset={pct} stop-color="transparent" />
		</linearGradient>
	</defs>
	<polygon fill={`url(#${gradId})`} points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
</svg>
