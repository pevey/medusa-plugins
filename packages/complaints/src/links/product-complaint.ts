import { defineLink } from '@medusajs/framework/utils'
import ProductModule from '@medusajs/medusa/product'
import ComplaintModule from '../modules/complaint'

export default defineLink(
	{
		linkable: ProductModule.linkable.product,
		field: 'id'
	},
	{
		...ComplaintModule.linkable.complaint.id,
		primaryKey: 'product_id'
	},
	{
		readOnly: true
	}
)
