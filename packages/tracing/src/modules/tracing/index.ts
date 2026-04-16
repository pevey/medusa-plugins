import { Module } from '@medusajs/framework/utils'
import { TracingService } from './service'

export const TRACING_MODULE = 'tracing'

export default Module(TRACING_MODULE, {
	service: TracingService
})

export * from './service'
