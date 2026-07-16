import { model } from '@medusajs/framework/utils'
import SearchDocumentTranslation from './search-document-translation'

const SearchDocument = model
	.define('search_document', {
		id: model.id({ prefix: 'srch' }).primaryKey(),
		type: model.text(),
		entity_id: model.text(),
		slug: model.text(),
		group_slug: model.text().nullable(),
		title: model.text(),
		snippet: model.text().nullable(),
		primary_text: model.text(),
		body_text: model.text().nullable(),
		weight: model.number().default(1),
		sales_channel_ids: model.array().nullable(),
		translations: model.hasMany(() => SearchDocumentTranslation, { mappedBy: 'search_document' })
	})
	.indexes([{ on: ['type', 'entity_id'], unique: true }])

export default SearchDocument
