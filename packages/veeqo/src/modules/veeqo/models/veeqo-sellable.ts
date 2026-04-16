import { model } from '@medusajs/framework/utils'

export const VeeqoSellable = model.define('veeqo_sellable', {
	id: model.id().primaryKey(),
	product_variant_id: model.text().unique(),
	veeqo_sellable_id: model.number().unique()
})
