import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import ReviewModule from '../modules/review'

export default defineLink(
	{
		linkable: ReviewModule.linkable.review,
		field: 'product_id'
	},
	ProductModule.linkable.product,
	{
		readOnly: true
	}
)
