import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'

export function registerProductTools(server: McpServer, scope: MedusaContainer) {
	const query = scope.resolve(ContainerRegistrationKeys.QUERY)

	server.registerTool(
		'search_products',
		{
			description: 'Search products by title.',
			inputSchema: {
				q: z.string().describe('Search term (matches title)'),
				limit: z.coerce.number().int().min(1).max(50).optional().default(10)
			}
		},
		async ({ q, limit }) => {
			const { data } = await query.graph({
				entity: 'product',
				fields: [
					'id',
					'title',
					'handle',
					'status',
					'variants.id',
					'variants.title',
					'variants.sku',
					'created_at'
				],
				filters: { title: { $ilike: `%${q}%` } },
				pagination: { take: limit }
			})

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
			}
		}
	)

	server.registerTool(
		'get_product',
		{
			description: 'Fetch a single product by ID with variants and pricing.',
			inputSchema: {
				product_id: z.string().describe('The product ID')
			}
		},
		async ({ product_id }) => {
			const {
				data: [product]
			} = await query.graph({
				entity: 'product',
				fields: [
					'id',
					'title',
					'handle',
					'subtitle',
					'description',
					'status',
					'variants.id',
					'variants.title',
					'variants.sku',
					'variants.prices.amount',
					'variants.prices.currency_code',
					'options.id',
					'options.title',
					'options.values.value',
					'tags.id',
					'tags.value',
					'created_at',
					'updated_at'
				],
				filters: { id: product_id }
			})

			if (!product) {
				return { content: [{ type: 'text' as const, text: 'Product not found.' }] }
			}

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(product, null, 2) }]
			}
		}
	)
}
