import { Module } from '@medusajs/framework/utils'
import { ComplaintService } from './service'

export const COMPLAINT_MODULE = 'complaint'

export default Module(COMPLAINT_MODULE, {
	service: ComplaintService
})

export * from './service'
