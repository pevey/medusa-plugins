import { Module } from '@medusajs/framework/utils'
import { AffiliateService } from './service'

export const AFFILIATE_MODULE = 'affiliate'

export default Module(AFFILIATE_MODULE, {
	service: AffiliateService
})

export * from './service'
export * from './types'
