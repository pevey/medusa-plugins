<script lang="ts">
	import type { Thing, WithContext } from 'schema-dts'
	type SchemaOrgType = Thing | WithContext<Thing>
	let { schema }: { schema: SchemaOrgType | SchemaOrgType[] } = $props()

	// Add '@context' if missing (array → single '@graph' node; object → merge).
	function withContext(s: unknown): unknown {
		const ctx = { '@context': 'https://schema.org' }
		return Array.isArray(s) ? { ...ctx, '@graph': s } : { ...ctx, ...(s as object) }
	}
	const processed = $derived(withContext(schema))
	// Escape '<' so schema values can't break out of the script tag; split the CLOSING tag so
	// the Svelte compiler doesn't end the module script block early.
	const jsonLd = $derived(
		'<script type="application/ld+json">' + JSON.stringify(processed).replace(/</g, '\\u003c') + '</scr' + 'ipt>'
	)
</script>

<svelte:head>{@html jsonLd}</svelte:head>
