import { model } from '@medusajs/framework/utils'

export const VeeqoChannel = model.define('veeqo_channel', {
	id: model.id().primaryKey(),
	sales_channel_id: model.text().unique(),
	veeqo_channel_id: model.number().unique()
})
