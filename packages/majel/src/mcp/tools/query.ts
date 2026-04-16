import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'

const ALLOWED_ENTITIES = [
	'order', 'product', 'product_variant', 'customer', 'inventory_item',
	'fulfillment', 'cart', 'shipping_option', 'sales_channel', 'store',
	'form', 'form_submission', 'review', 'complaint', 'complaint_tag',
	'content_item', 'content_collection', 'stock_lot', 'serial_number',
	'veeqo_order', 'veeqo_shipment', 'webhook_trigger', 'webhook_action',
	'barcode', 'order_note', 'customer_tag'
]

export function registerQueryTool(server: McpServer, scope: MedusaContainer) {
	server.registerTool(
		'query',
		{
			description:
				`Run a query against any Medusa entity using query.graph(). Allowed entities: ${ALLOWED_ENTITIES.join(', ')}. ` +
				'Use dot notation for relations (e.g. "customer.first_name"). ' +
				'Filters support operators: $eq, $ne, $in, $nin, $like, $ilike, $gt, $gte, $lt, $lte.',
			inputSchema: {
				entity: z.enum(ALLOWED_ENTITIES as [string, ...string[]]),
				fields: z.array(z.string()).min(1).describe('Fields to return, e.g. ["id", "email", "orders.id"]'),
				filters: z.record(z.unknown()).optional().describe('Filter conditions, e.g. { status: "completed" }'),
				limit: z.coerce.number().int().min(1).max(100).optional().default(20),
				offset: z.coerce.number().int().min(0).optional().default(0)
			}
		},
		async ({ entity, fields, filters, limit, offset }) => {
			const query = scope.resolve(ContainerRegistrationKeys.QUERY)

			const { data, metadata } = await query.graph({
				entity,
				fields,
				filters: filters ?? {},
				pagination: { take: limit, skip: offset }
			})

			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({ data, count: metadata?.count ?? data.length, limit, offset }, null, 2)
				}]
			}
		}
	)
}
