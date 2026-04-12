import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoSellable,
		field: 'product_id'
	},
	ProductModule.linkable.productVariant,
	{
		readOnly: true
	}
)
