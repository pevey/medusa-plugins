import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'

export function registerCustomerTools(server: McpServer, scope: MedusaContainer) {
	const query = scope.resolve(ContainerRegistrationKeys.QUERY)

	server.registerTool(
		'search_customers',
		{
			description: 'Search customers by email or name.',
			inputSchema: {
				q: z.string().describe('Search term (matches email, first_name, or last_name)'),
				limit: z.coerce.number().int().min(1).max(50).optional().default(10)
			}
		},
		async ({ q, limit }) => {
			const { data } = await query.graph({
				entity: 'customer',
				fields: [
					'id',
					'email',
					'first_name',
					'last_name',
					'phone',
					'has_account',
					'created_at'
				],
				filters: {
					$or: [
						{ email: { $ilike: `%${q}%` } },
						{ first_name: { $ilike: `%${q}%` } },
						{ last_name: { $ilike: `%${q}%` } }
					]
				},
				pagination: { take: limit }
			})

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
			}
		}
	)

	server.registerTool(
		'get_customer',
		{
			description: 'Fetch a single customer by ID with their order history.',
			inputSchema: {
				customer_id: z.string().describe('The customer ID')
			}
		},
		async ({ customer_id }) => {
			const {
				data: [customer]
			} = await query.graph({
				entity: 'customer',
				fields: [
					'id',
					'email',
					'first_name',
					'last_name',
					'phone',
					'has_account',
					'orders.id',
					'orders.display_id',
					'orders.status',
					'orders.total',
					'orders.created_at',
					'created_at',
					'updated_at'
				],
				filters: { id: customer_id }
			})

			if (!customer) {
				return { content: [{ type: 'text' as const, text: 'Customer not found.' }] }
			}

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(customer, null, 2) }]
			}
		}
	)
}
