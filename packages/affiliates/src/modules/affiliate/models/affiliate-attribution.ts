import { model } from '@medusajs/framework/utils'

export const AffiliateAttribution = model
	.define('affiliate_attribution', {
		id: model.id({ prefix: 'affattr' }).primaryKey(),
		affiliate_id: model.text(),
		promotion_id: model.text(),
		order_id: model.text(),
		currency_code: model.text(),
		gross_subtotal: model.number().default(0),
		net_subtotal: model.number().default(0),
		placed_at: model.dateTime(),
		captured_at: model.dateTime().nullable(),
		completed_at: model.dateTime().nullable(),
		voided_at: model.dateTime().nullable(),
		commission_rate: model.float().nullable(),
		commission_amount: model.number().nullable(),
		payout_id: model.text().nullable(),
		paid_at: model.dateTime().nullable(),
		metadata: model.json().nullable()
	})
	.indexes([
		{ on: ['affiliate_id', 'completed_at'] },
		{ on: ['affiliate_id', 'captured_at'] },
		{ on: ['affiliate_id', 'placed_at'] },
		{ on: ['affiliate_id', 'promotion_id'] },
		{ on: ['order_id'], unique: true }
	])
