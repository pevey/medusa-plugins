import { Module } from '@medusajs/framework/utils'
import restrictStoreFields from './loaders/restrict-store-fields'
import { CustomerTagService } from './service'

export const CUSTOMER_TAG_MODULE = 'customer_tag'

export default Module(CUSTOMER_TAG_MODULE, {
	service: CustomerTagService,
	loaders: [restrictStoreFields]
})

export * from './service'
export * from './types'
