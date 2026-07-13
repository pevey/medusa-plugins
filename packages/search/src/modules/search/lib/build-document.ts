import type { SearchDocumentInput } from './types'

const SNIPPET_MAX = 160

export function truncate(text: string | null | undefined, max = SNIPPET_MAX): string | null {
	if (text === null || text === undefined) return null
	const trimmed = text.trim()
	if (trimmed.length === 0) return null
	return trimmed.length > max ? trimmed.slice(0, max) : trimmed
}

type ProductGraph = {
	id: string
	title: string
	description?: string | null
	handle: string
	variants?: { options?: { value: string }[] | null }[] | null
	sales_channels?: { id: string }[] | null
}
type CategoryGraph = { id: string; name: string; handle: string }
type CollectionGraph = { id: string; title: string; handle: string }

export function buildProductDocument(p: ProductGraph): SearchDocumentInput {
	const values: string[] = []
	const seen = new Set<string>()
	for (const variant of p.variants ?? []) {
		for (const option of variant.options ?? []) {
			const value = option.value?.trim()
			if (value && !seen.has(value)) {
				seen.add(value)
				values.push(value)
			}
		}
	}
	const primary = [p.title, ...values].join(' ').trim()
	return {
		type: 'product',
		entity_id: p.id,
		slug: p.handle,
		group_slug: null,
		title: p.title,
		snippet: truncate(p.description),
		primary_text: primary,
		secondary_text: truncate(p.description),
		weight: 1,
		sales_channel_ids: (p.sales_channels ?? []).map((s) => s.id)
	}
}

export function buildCategoryDocument(c: CategoryGraph): SearchDocumentInput {
	return {
		type: 'category',
		entity_id: c.id,
		slug: c.handle,
		group_slug: null,
		title: c.name,
		snippet: null,
		primary_text: c.name,
		secondary_text: null,
		weight: 0.9,
		sales_channel_ids: null
	}
}

export function buildCollectionDocument(c: CollectionGraph): SearchDocumentInput {
	return {
		type: 'collection',
		entity_id: c.id,
		slug: c.handle,
		group_slug: null,
		title: c.title,
		snippet: null,
		primary_text: c.title,
		secondary_text: null,
		weight: 0.9,
		sales_channel_ids: null
	}
}
