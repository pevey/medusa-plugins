import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { z } from 'zod'

export function registerInventoryTools(server: McpServer, scope: MedusaContainer) {
	const query = scope.resolve(ContainerRegistrationKeys.QUERY)

	server.registerTool(
		'low_stock_items',
		{
			description: 'Find inventory items with stock levels at or below a threshold.',
			inputSchema: {
				threshold: z.coerce.number().int().min(0).optional().default(10),
				limit: z.coerce.number().int().min(1).max(100).optional().default(20)
			}
		},
		async ({ threshold, limit }) => {
			const { data } = await query.graph({
				entity: 'inventory_item',
				fields: [
					'id',
					'sku',
					'title',
					'location_levels.id',
					'location_levels.stocked_quantity',
					'location_levels.reserved_quantity',
					'location_levels.stock_location.id',
					'location_levels.stock_location.name'
				],
				filters: {
					location_levels: {
						stocked_quantity: { $lte: threshold }
					}
				} as any,
				pagination: { take: limit }
			})

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(data, null, 2) }]
			}
		}
	)

	server.registerTool(
		'get_inventory_item',
		{
			description: 'Fetch a single inventory item by ID with stock levels across locations.',
			inputSchema: {
				inventory_item_id: z.string().describe('The inventory item ID')
			}
		},
		async ({ inventory_item_id }) => {
			const {
				data: [item]
			} = await query.graph({
				entity: 'inventory_item',
				fields: [
					'id',
					'sku',
					'title',
					'requires_shipping',
					'location_levels.id',
					'location_levels.stocked_quantity',
					'location_levels.reserved_quantity',
					'location_levels.incoming_quantity',
					'location_levels.stock_location.id',
					'location_levels.stock_location.name',
					'created_at',
					'updated_at'
				],
				filters: { id: inventory_item_id }
			})

			if (!item) {
				return { content: [{ type: 'text' as const, text: 'Inventory item not found.' }] }
			}

			return {
				content: [{ type: 'text' as const, text: JSON.stringify(item, null, 2) }]
			}
		}
	)
}
