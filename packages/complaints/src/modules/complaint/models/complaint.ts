import { model } from '@medusajs/framework/utils'
import { ComplaintTag } from './complaint-tag'
import { ComplaintActivity } from './complaint-activity'

export enum ComplaintStatus {
	OPEN = 'open',
	CLOSED = 'closed'
}

export const Complaint = model
	.define('complaint', {
		id: model.id().primaryKey(),
		number: model.autoincrement(),
		status: model.enum(ComplaintStatus).default(ComplaintStatus.OPEN),
		description: model.text().searchable(),
		customer_id: model.text(),
		order_id: model.text(),
		product_id: model.text(),
		serial_number_id: model.text().nullable(),
		stock_lot_id: model.text().nullable(),
		metadata: model.json().nullable(),
		tags: model.manyToMany(() => ComplaintTag),
		activity: model.hasMany(() => ComplaintActivity, {
			mappedBy: 'complaint'
		})
	})
	.cascades({
		delete: ['activity'] // <-- delete all activity records when complaint is deleted
	})
