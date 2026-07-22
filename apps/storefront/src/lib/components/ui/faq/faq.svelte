<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import type { Snippet } from 'svelte'

	interface Props {
		type?: 'single' | 'multiple'
		value?: string | string[]
		class?: string
		children: Snippet
		[key: string]: unknown
	}
	let {
		type = 'single',
		value = $bindable(),
		class: className = '',
		children,
		...rest
	}: Props = $props()
</script>

<Accordion.Root {type} bind:value={value as never} data-slot="faq" class={className} {...rest}>
	{@render children()}
</Accordion.Root>
