import { model } from '@medusajs/framework/utils'

export const CustomerTag = model.define('customer_tag', {
	id: model.id().primaryKey(),
	value: model.text(),
	metadata: model.json().nullable()
})
