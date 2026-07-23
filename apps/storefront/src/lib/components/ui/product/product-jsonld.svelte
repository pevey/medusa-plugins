<script lang="ts">
	import { page } from '$app/state'
	import { getProductContext } from './ctx.svelte.js'
	import JsonLd from '$lib/components/ui/seo/json-ld.svelte'
	import { productSchema } from './product-schema.js'
	import type { Product, WithContext } from 'schema-dts'

	let { override, transform }: {
		override?: Partial<Product>
		transform?: (schema: WithContext<Product>) => WithContext<Product>
	} = $props()
	const ctx = getProductContext()

	const schema = $derived.by(() => {
		const auto = productSchema(ctx.product, { url: page.url.href })
		if (!auto) return null
		const merged = (override ? { ...auto, ...override } : auto) as WithContext<Product>
		return transform ? transform(merged) : merged
	})
</script>

{#if schema}<JsonLd {schema} />{/if}
