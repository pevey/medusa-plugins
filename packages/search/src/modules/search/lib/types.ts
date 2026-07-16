export type SearchDocumentInput = {
	type: string
	entity_id: string
	slug: string
	group_slug: string | null
	title: string
	snippet: string | null
	primary_text: string
	body_text?: string | null
	weight: number
	sales_channel_ids: string[] | null
}

export type SearchTranslationInput = {
	search_document_id: string
	locale: string
	title: string
	snippet: string | null
	primary_text: string
	body_text?: string | null
}

export type SearchHit = {
	type: string
	id: string
	slug: string
	group_slug: string | null
	title: string
	snippet: string | null
	score: number
}

export type SearchSource = {
	type: string
	entity: string
	fields: string[]
	reindexFilters?: Record<string, unknown>
	translationReference?: string
	visibility: (row: any) => boolean
	buildDocument: (row: any) => SearchDocumentInput
}

export type PluginOptions = {
	sources?: Array<'category' | 'collection' | SearchSource>
	weights?: Record<string, number>
	wordSimilarityThreshold?: number
	limit?: number
	defaultLanguage?: string
	bodyWeight?: number
	localeTextSearchConfig?: Record<string, string>
	translations?: boolean
}
