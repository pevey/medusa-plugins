// Source: packages/search/src/api/store/search/ + packages/search/src/api/admin/search/reindex/
// Routes: GET /store/search, POST /admin/search/reindex

// Built-in source types are product/category/collection; hosts may register custom
// source types (e.g. 'content'), so the string is intentionally open-ended.
export type StoreSearchHitType = 'product' | 'category' | 'collection' | (string & {})

export interface StoreSearchHit {
	type: StoreSearchHitType
	id: string
	slug: string
	group_slug: string | null
	title: string
	snippet: string | null
	score: number
}

// ── Store ────────────────────────────────────────────────────────────────────

export interface StoreSearchQuery {
	q: string
	limit?: number
}

export interface StoreSearchResponse {
	hits: StoreSearchHit[]
}

// ── Admin ────────────────────────────────────────────────────────────────────

export interface AdminSearchReindexResponse {
	// counts of documents rebuilt, keyed by source type (product, category, collection, …)
	counts: Record<string, number>
}
