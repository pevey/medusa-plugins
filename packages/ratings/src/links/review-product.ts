import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import ReviewModule from '../modules/review'

export default defineLink(
	{
		linkable: ProductModule.linkable.product,
		field: 'id'
	},
	{
		...ReviewModule.linkable.review.id,
		primaryKey: 'product_id'
	},
	{
		readOnly: true
	}
)
