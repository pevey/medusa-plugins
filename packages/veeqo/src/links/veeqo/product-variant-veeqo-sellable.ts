import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: ProductModule.linkable.productVariant,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoSellable.id,
		primaryKey: 'product_variant_id'
	},
	{
		readOnly: true
	}
)
