import { model } from '@medusajs/framework/utils'
import { Complaint } from './complaint'

export const ComplaintDocument = model.define('complaint_document', {
	id: model.id().primaryKey(),
	file_key: model.text(),
	filename: model.text(),
	mime_type: model.text(),
	size_bytes: model.number(),
	uploaded_by: model.text().nullable(),
	complaint: model.belongsTo(() => Complaint, {
		mappedBy: 'documents'
	})
})
