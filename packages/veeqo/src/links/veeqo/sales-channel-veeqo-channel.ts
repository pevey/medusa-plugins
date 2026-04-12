import { defineLink } from '@medusajs/framework/utils'
import SalesChannelModule from '@medusajs/medusa/sales-channel'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: SalesChannelModule.linkable.salesChannel,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoChannel.id,
		primaryKey: 'sales_channel_id'
	},
	{
		readOnly: true
	}
)
