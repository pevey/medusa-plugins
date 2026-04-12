import { defineLink } from '@medusajs/framework/utils'
import FulfillmentModule from '@medusajs/medusa/fulfillment'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoShipment,
		field: 'fulfillment_id'
	},
	FulfillmentModule.linkable.fulfillment,
	{
		readOnly: true
	}
)
