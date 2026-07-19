import { model } from '@medusajs/framework/utils'

export const VeeqoProduct = model.define('veeqo_product', {
	id: model.id().primaryKey(),
	product_id: model.text().unique(),
	veeqo_product_id: model.number().unique()
})
