import { model } from '@medusajs/framework/utils'

export const OrderNote = model.define('order_note', {
	id: model.id().primaryKey(),
	order_id: model.text(),
	user_id: model.text(),
	note: model.text(),
	sent: model.boolean().default(false),
	metadata: model.json().nullable()
})
