import { Module } from '@medusajs/framework/utils'
import { CustomerTagService } from './service'

export const CUSTOMER_TAG_MODULE = 'customer_tag'

export default Module(CUSTOMER_TAG_MODULE, {
	service: CustomerTagService
})
