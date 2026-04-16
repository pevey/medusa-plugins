import { model } from '@medusajs/framework/utils'
import { Complaint } from './complaint'

export enum ComplaintActivityType {
	OPEN = 'open',
	CLOSE = 'close',
	NOTE = 'note'
}

export const ComplaintActivity = model.define('complaint_activity', {
	id: model.id().primaryKey(),
	type: model.enum(ComplaintActivityType).default(ComplaintActivityType.NOTE),
	user_id: model.text(),
	note: model.text().nullable(),
	metadata: model.json().nullable(),
	complaint: model.belongsTo(() => Complaint, {
		mappedBy: 'activity'
	})
})
