<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import type { Snippet } from 'svelte'

	interface Props {
		value: string
		class?: string
		children: Snippet
		[key: string]: unknown
	}
	let { value, class: className = '', children, ...rest }: Props = $props()
</script>

<Accordion.Item {value} data-slot="faq-item" class={className} {...rest}>
	{@render children()}
</Accordion.Item>
