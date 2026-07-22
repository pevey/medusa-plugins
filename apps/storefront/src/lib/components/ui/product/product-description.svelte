<script module lang="ts">
	import DOMPurify from 'isomorphic-dompurify'
	// Force rel="noopener noreferrer" on target=_blank links (reverse-tabnabbing). Registered
	// once at module load; only this component sanitizes with DOMPurify.
	DOMPurify.addHook('afterSanitizeAttributes', (node) => {
		if (node.tagName === 'A' && node.getAttribute('target') === '_blank') {
			node.setAttribute('rel', 'noopener noreferrer')
		}
	})
</script>

<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { getProductContext } from './ctx.svelte.js'

	let { class: className = '' }: { class?: string } = $props()
	const ctx = getProductContext()

	// product.description is raw admin HTML from Medusa → sanitize before {@html}.
	const html = $derived(DOMPurify.sanitize(ctx.product?.description ?? ''))
</script>

<div class={cn('text-sm [&_a]:underline', className)}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>
