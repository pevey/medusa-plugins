<script lang="ts">
	import { Accordion as AccordionPrimitive } from 'bits-ui'
	import ChevronDownIcon from '@lucide/svelte/icons/chevron-down'
	import { cn, type WithoutChild } from '$lib/utils.js'
	import type { Snippet } from 'svelte'

	let {
		ref = $bindable(null),
		class: className,
		level = 3,
		icon,
		iconRotate = 180,
		children,
		...restProps
	}: WithoutChild<AccordionPrimitive.TriggerProps> & {
		level?: AccordionPrimitive.HeaderProps['level']
		icon?: Snippet
		iconRotate?: number
		children: Snippet
	} = $props()
</script>

<AccordionPrimitive.Header {level} class="flex">
	<AccordionPrimitive.Trigger
		bind:ref
		data-slot="faq-question"
		class={cn(
			'group/faq-question focus-visible:border-ring focus-visible:ring-ring/50 flex flex-1 items-center justify-between gap-4 rounded-md py-4 text-left text-sm font-medium transition-colors outline-none hover:underline focus-visible:ring-3 disabled:pointer-events-none disabled:opacity-50',
			className
		)}
		{...restProps}
	>
		{@render children()}
		<span
			class="text-muted-foreground pointer-events-none shrink-0 transition-transform duration-200 group-aria-expanded/faq-question:[transform:rotate(var(--faq-icon-rotate))]"
			style="--faq-icon-rotate: {iconRotate}deg"
		>
			{#if icon}
				{@render icon()}
			{:else}
				<ChevronDownIcon class="size-4" />
			{/if}
		</span>
	</AccordionPrimitive.Trigger>
</AccordionPrimitive.Header>
