import { model } from '@medusajs/framework/utils'
import { Review } from './review'

export enum ReviewActivityType {
	SUBMIT = 'submit',
	APPROVE = 'approve',
	REJECT = 'reject',
	NOTE = 'note'
}

export const ReviewActivity = model.define('review_activity', {
	id: model.id().primaryKey(),
	type: model.enum(ReviewActivityType).default(ReviewActivityType.NOTE),
	user_id: model.text(),
	note: model.text().nullable(),
	metadata: model.json().nullable(),
	review: model.belongsTo(() => Review, { mappedBy: 'activity' })
})
