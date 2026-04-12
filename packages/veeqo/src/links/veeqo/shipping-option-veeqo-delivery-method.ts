import { defineLink } from '@medusajs/framework/utils'
import FulfillmentModule from '@medusajs/medusa/fulfillment'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: FulfillmentModule.linkable.shippingOption,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoDeliveryMethod.id,
		primaryKey: 'shipping_option_id'
	},
	{
		readOnly: true
	}
)
