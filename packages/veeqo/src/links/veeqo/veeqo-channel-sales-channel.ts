import { defineLink } from '@medusajs/framework/utils'
import SalesChannelModule from '@medusajs/medusa/sales-channel'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoChannel,
		field: 'sales_channel_id'
	},
	SalesChannelModule.linkable.salesChannel,
	{
		readOnly: true
	}
)
