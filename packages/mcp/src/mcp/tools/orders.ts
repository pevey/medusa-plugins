import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'

export function registerOrderTools(server: McpServer, scope: MedusaContainer) {
	const query = scope.resolve(ContainerRegistrationKeys.QUERY)

	server.registerTool(
		'recent_orders',
		{
			description: 'Fetch recent orders with status, totals, and customer info.',
			inputSchema: {
				limit: z.coerce.number().int().min(1).max(50).optional().default(10),
				status: z.string().optional().describe('Filter by order status')
			}
		},
		async ({ limit, status }) => {
			const { data } = await query.graph({
				entity: 'order',
				fields: [
					'id',
					'display_id',
					'status',
					'email',
					'total',
					'subtotal',
					'tax_total',
					'shipping_total',
					'customer.first_name',
					'customer.last_name',
					'created_at'
				],
				filters: (status ? { status } : {}) as any,
				pagination: { take: limit, order: { created_at: 'DESC' } }
			})

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
			}
		}
	)

	server.registerTool(
		'get_order',
		{
			description: 'Fetch a single order by ID with full details including items, fulfillments, and customer.',
			inputSchema: {
				order_id: z.string().describe('The order ID')
			}
		},
		async ({ order_id }) => {
			const {
				data: [order]
			} = await query.graph({
				entity: 'order',
				fields: [
					'id',
					'display_id',
					'status',
					'email',
					'total',
					'subtotal',
					'tax_total',
					'shipping_total',
					'discount_total',
					'customer.id',
					'customer.first_name',
					'customer.last_name',
					'customer.email',
					'items.id',
					'items.title',
					'items.quantity',
					'items.unit_price',
					'shipping_address.*',
					'billing_address.*',
					'fulfillments.id',
					'fulfillments.status',
					'created_at',
					'updated_at'
				],
				filters: { id: order_id }
			})

			if (!order) {
				return { content: [{ type: 'text' as const, text: 'Order not found.' }] }
			}

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(order, null, 2) }]
			}
		}
	)
}
