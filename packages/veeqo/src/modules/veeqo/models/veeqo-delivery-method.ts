import { model } from '@medusajs/framework/utils'

export const VeeqoDeliveryMethod = model.define('veeqo_delivery_method', {
	id: model.id().primaryKey(),
	shipping_option_id: model.text().unique(),
	veeqo_delivery_method_id: model.number().unique()
})
