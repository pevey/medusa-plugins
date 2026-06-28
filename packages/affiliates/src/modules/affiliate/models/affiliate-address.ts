import { model } from '@medusajs/framework/utils'
import { Affiliate } from './affiliate'

export const AffiliateAddress = model.define('affiliate_address', {
	id: model.id({ prefix: 'affaddr' }).primaryKey(),
	affiliate: model.belongsTo(() => Affiliate, { mappedBy: 'addresses' }),
	first_name: model.text().nullable(),
	last_name: model.text().nullable(),
	company: model.text().nullable(),
	address_1: model.text().nullable(),
	address_2: model.text().nullable(),
	city: model.text().nullable(),
	province: model.text().nullable(),
	country_code: model.text().nullable(),
	postal_code: model.text().nullable(),
	phone: model.text().nullable(),
	metadata: model.json().nullable()
})
