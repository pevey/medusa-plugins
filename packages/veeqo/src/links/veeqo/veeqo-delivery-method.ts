import { defineLink } from '@medusajs/framework/utils'
import FulfillmentModule from '@medusajs/medusa/fulfillment'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoDeliveryMethod,
		field: 'shipping_option_id'
	},
	FulfillmentModule.linkable.shippingOption,
	{
		readOnly: true
	}
)
