import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: ProductModule.linkable.product,
		field: 'id'
	},
	{
		...VeeqoModule.linkable.veeqoProduct.id,
		primaryKey: 'product_id'
	},
	{
		readOnly: true
	}
)
