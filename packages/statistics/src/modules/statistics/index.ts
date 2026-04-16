import { Module } from '@medusajs/framework/utils'
import { StatisticsService } from './service'

export const STATISTICS_MODULE = 'statistics'

export default Module(STATISTICS_MODULE, {
	service: StatisticsService
})

export * from './service'
