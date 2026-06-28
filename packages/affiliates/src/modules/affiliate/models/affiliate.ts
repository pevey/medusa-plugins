import { model } from '@medusajs/framework/utils'
import { AffiliateStatus } from '../types'
import { AffiliateAddress } from './affiliate-address'

export const Affiliate = model
	.define('affiliate', {
		id: model.id({ prefix: 'aff' }).primaryKey(),
		name: model.text(),
		email: model.text(),
		phone: model.text().nullable(),
		currency_code: model.text().nullable(),
		status: model.enum(AffiliateStatus).default(AffiliateStatus.ACTIVE),
		addresses: model.hasMany(() => AffiliateAddress, { mappedBy: 'affiliate' }),
		primary_address_id: model.text().nullable(),
		metadata: model.json().nullable()
	})
	.cascades({
		delete: ['addresses']
	})
