import { model } from '@medusajs/framework/utils'
import { ReviewActivity } from './review-activity'

export enum ReviewStatus {
	PENDING = 'pending',
	APPROVED = 'approved',
	REJECTED = 'rejected'
}

export const Review = model
	.define('review', {
		id: model.id().primaryKey(),
		status: model.enum(ReviewStatus).default(ReviewStatus.PENDING),
		rating: model.number(),
		title: model.text().nullable(),
		body: model.text(),
		author_name: model.text(),
		author_email: model.text().nullable(),
		product_id: model.text().nullable(),
		order_id: model.text().nullable(),
		customer_id: model.text().nullable(),
		metadata: model.json().nullable(),
		activity: model.hasMany(() => ReviewActivity, { mappedBy: 'review' })
	})
	.cascades({
		delete: ['activity']
	})
