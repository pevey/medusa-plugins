<script lang="ts">
	import * as Accordion from '$lib/components/ui/accordion/index.js'
	import type { Snippet } from 'svelte'

	interface Props {
		class?: string
		children: Snippet
		[key: string]: unknown
	}
	let { class: className = '', children, ...rest }: Props = $props()
</script>

<!-- Content renders `children`, so `<Faq.Answer>{@html item.description}</Faq.Answer>` works. -->
<Accordion.Content data-slot="faq-answer" class={className} {...rest}>
	{@render children()}
</Accordion.Content>
