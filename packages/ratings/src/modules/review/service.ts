import { MedusaService } from '@medusajs/framework/utils'
import { Review } from './models/review'
import { ReviewActivity, ReviewActivityType } from './models/review-activity'
import { ReviewStatus } from './models/review'

export type ReviewModuleOptions = {
	defaultStatus?: ReviewStatus
}

export class ReviewService extends MedusaService({ Review, ReviewActivity }) {
	protected options_: ReviewModuleOptions

	constructor(container: any, options?: ReviewModuleOptions) {
		super(container)
		this.options_ = {
			defaultStatus: options?.defaultStatus ?? ReviewStatus.PENDING
		}
	}

	getOptions(): ReviewModuleOptions {
		return this.options_
	}

	async approveReview(id: string, userId: string) {
		const review = await this.updateReviews({ id, status: ReviewStatus.APPROVED })
		await this.createReviewActivities({
			review_id: id,
			user_id: userId,
			type: ReviewActivityType.APPROVE
		})
		return review
	}

	async rejectReview(id: string, userId: string) {
		const review = await this.updateReviews({ id, status: ReviewStatus.REJECTED })
		await this.createReviewActivities({
			review_id: id,
			user_id: userId,
			type: ReviewActivityType.REJECT
		})
		return review
	}

	async addNote(reviewId: string, userId: string, note: string) {
		return this.createReviewActivities({
			review_id: reviewId,
			user_id: userId,
			type: ReviewActivityType.NOTE,
			note
		})
	}
}
