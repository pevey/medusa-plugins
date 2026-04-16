import { Module } from '@medusajs/framework/utils'
import { PrivateAnalyticsService } from './service'

export const PRIVATE_ANALYTICS_MODULE = 'private_analytics'

export default Module(PRIVATE_ANALYTICS_MODULE, {
	service: PrivateAnalyticsService
})

export * from './service'
