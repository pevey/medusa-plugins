import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: ComplaintModule.linkable.complaint,
		field: 'product_id'
	},
	ProductModule.linkable.product,
	{
		readOnly: true
	}
)
