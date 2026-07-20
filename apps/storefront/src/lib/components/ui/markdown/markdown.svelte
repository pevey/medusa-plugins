<script lang="ts">
	// Renders backend-produced, already-sanitized content HTML (e.g. content_item.body_html
	// from the Medusa content plugin's ?render=html). Presentational only: it does NOT fetch
	// or transform — pass the HTML string in. Styling comes entirely from markdown.css, which
	// maps onto shadcn CSS variables, so it inherits the host project's theme (incl. dark mode).
	import './markdown.css'

	interface Props {
		/** Sanitized HTML string (e.g. content_item.body_html). */
		html: string
		/** Extra classes for the wrapper. */
		class?: string
	}

	let { html, class: className = '' }: Props = $props()
</script>

<div class={`markdown-prose ${className}`}>
	<!-- eslint-disable-next-line svelte/no-at-html-tags -->
	{@html html}
</div>
