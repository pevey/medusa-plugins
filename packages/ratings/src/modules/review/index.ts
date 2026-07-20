import { Module } from '@medusajs/framework/utils'
import { ReviewService } from './service'

export const REVIEW_MODULE = 'review'

export default Module(REVIEW_MODULE, {
	service: ReviewService
})

export * from './service'
