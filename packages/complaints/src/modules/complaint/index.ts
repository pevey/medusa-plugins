import { Module } from '@medusajs/framework/utils'
import restrictStoreFields from './loaders/restrict-store-fields'
import { ComplaintService } from './service'

export const COMPLAINT_MODULE = 'complaint'

export default Module(COMPLAINT_MODULE, {
	service: ComplaintService,
	loaders: [restrictStoreFields]
})

export * from './service'
export * from './types'
