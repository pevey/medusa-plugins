import { model } from '@medusajs/framework/utils'
import SearchDocument from './search-document'

const SearchDocumentTranslation = model
	.define('search_document_translation', {
		id: model.id({ prefix: 'srtr' }).primaryKey(),
		locale: model.text(),
		title: model.text(),
		snippet: model.text().nullable(),
		primary_text: model.text(),
		body_text: model.text().nullable(),
		search_document: model.belongsTo(() => SearchDocument, { mappedBy: 'translations' })
	})
	.indexes([{ on: ['search_document_id', 'locale'], unique: true }])

export default SearchDocumentTranslation
