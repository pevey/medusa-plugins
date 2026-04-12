import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import VeeqoModule from '../../modules/veeqo'

export default defineLink(
	{
		linkable: VeeqoModule.linkable.veeqoProduct,
		field: 'product_id'
	},
	ProductModule.linkable.product,
	{
		readOnly: true
	}
)
