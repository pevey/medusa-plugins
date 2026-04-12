import { defineLink } from '@medusajs/framework/utils'
import FulfillmentModule from '@medusajs/medusa/fulfillment'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: FulfillmentModule.linkable.fulfillment,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoShipment.id,
		primaryKey: 'fulfillment_id'
	},
	{
		readOnly: true
	}
)
