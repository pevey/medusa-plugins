import { buildProductDocument, buildCategoryDocument, buildCollectionDocument } from './build-document'
import type { SearchSource, PluginOptions } from './types'

export const productSource: SearchSource = {
	type: 'product',
	entity: 'product',
	fields: ['id', 'title', 'description', 'handle', 'status', 'variants.options.value', 'sales_channels.id'],
	reindexFilters: { status: 'published' },
	visibility: p => p.status === 'published',
	buildDocument: p => buildProductDocument(p)
}

export const categorySource: SearchSource = {
	type: 'category',
	entity: 'product_category',
	fields: ['id', 'name', 'handle', 'is_active', 'is_internal'],
	reindexFilters: { is_active: true, is_internal: false },
	visibility: c => !!c.is_active && !c.is_internal,
	buildDocument: c => buildCategoryDocument(c)
}

export const collectionSource: SearchSource = {
	type: 'collection',
	entity: 'product_collection',
	fields: ['id', 'title', 'handle'],
	visibility: () => true,
	buildDocument: c => buildCollectionDocument(c)
}

const BUILTIN: Record<string, SearchSource> = {
	category: categorySource,
	collection: collectionSource
}

export function buildRegistry(options: PluginOptions = {}): Map<string, SearchSource> {
	const registry = new Map<string, SearchSource>()
	registry.set('product', productSource) // always on
	for (const entry of options.sources ?? []) {
		if (typeof entry === 'string') {
			const builtin = BUILTIN[entry]
			if (builtin) registry.set(builtin.type, builtin)
		} else if (entry && typeof entry === 'object') {
			registry.set(entry.type, entry)
		}
	}
	return registry
}
