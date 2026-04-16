import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'
import { z } from 'zod'
import { dispatchAndRecord } from 'medusa-plugin-automation/lib/dispatch'

export function registerAutomationTools(
	server: McpServer,
	scope: MedusaContainer,
	moduleKey: string
): void {
	const automationService = scope.resolve(moduleKey) as any

	server.registerTool(
		'list_automations',
		{
			description: 'List automation triggers with their status, type, and event configuration.',
			inputSchema: {
				is_active: z.boolean().optional().describe('Filter by active status'),
				limit: z.coerce.number().int().min(1).max(100).optional().default(20)
			}
		},
		async ({ is_active, limit }) => {
			const filters: Record<string, unknown> = {}
			if (is_active !== undefined) filters.is_active = is_active

			const [triggers, count] = await automationService.listAndCountAutomationTriggers(
				filters,
				{ take: limit, order: { created_at: 'DESC' } }
			)

			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({ triggers, count }, null, 2)
				}]
			}
		}
	)

	server.registerTool(
		'get_automation',
		{
			description: 'Fetch a single automation trigger by ID with its actions.',
			inputSchema: {
				trigger_id: z.string().describe('The automation trigger ID')
			}
		},
		async ({ trigger_id }) => {
			const [trigger] = await automationService.listAutomationTriggers(
				{ id: trigger_id },
				{ take: 1 }
			)

			if (!trigger) {
				return { content: [{ type: 'text' as const, text: 'Trigger not found.' }] }
			}

			const [actions] = await automationService.listAndCountAutomationActions(
				{ trigger_id: trigger.id },
				{ take: 100 }
			)

			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({ trigger, actions }, null, 2)
				}]
			}
		}
	)

	server.registerTool(
		'list_automation_deliveries',
		{
			description: 'View delivery history for an automation action. Filter by status and date range.',
			inputSchema: {
				action_id: z.string().describe('The automation action ID'),
				status: z.enum(['pending', 'success', 'failed']).optional().describe('Filter by delivery status'),
				since: z.string().optional().describe('Only include deliveries after this ISO date'),
				until: z.string().optional().describe('Only include deliveries before this ISO date'),
				limit: z.coerce.number().int().min(1).max(100).optional().default(20)
			}
		},
		async ({ action_id, status, since, until, limit }) => {
			const filters: Record<string, unknown> = { action_id }
			if (status) filters.status = status
			if (since || until) {
				filters.created_at = {
					...(since ? { $gte: new Date(since) } : {}),
					...(until ? { $lte: new Date(until) } : {})
				}
			}

			const [deliveries, count] = await automationService.listAndCountAutomationDeliveries(
				filters,
				{ take: limit, order: { created_at: 'DESC' } }
			)

			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({ deliveries, count }, null, 2)
				}]
			}
		}
	)

	server.registerTool(
		'trigger_automation',
		{
			description: 'Manually fire all active actions on an automation trigger with a given payload.',
			inputSchema: {
				trigger_id: z.string().describe('The automation trigger ID'),
				payload: z.record(z.unknown()).optional().default({}).describe('The payload to dispatch')
			}
		},
		async ({ trigger_id, payload }) => {
			const [trigger] = await automationService.listAutomationTriggers(
				{ id: trigger_id },
				{ take: 1 }
			)

			if (!trigger) {
				return { content: [{ type: 'text' as const, text: 'Trigger not found.' }] }
			}

			const [actions] = await automationService.listAndCountAutomationActions(
				{ trigger_id: trigger.id, is_active: true },
				{ take: 100 }
			)

			if (actions.length === 0) {
				return { content: [{ type: 'text' as const, text: 'No active actions on this trigger.' }] }
			}

			const results = await Promise.allSettled(
				actions.map((action: any) =>
					dispatchAndRecord(scope, action, payload, `mcp:trigger_automation`, {
						signOutgoing: true,
						maxWorkflowIterations: automationService.getOptions?.()?.maxWorkflowIterations
					})
				)
			)

			const succeeded = results.filter(r => r.status === 'fulfilled' && r.value.status === 'success').length
			const failed = results.length - succeeded

			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({
						triggered: actions.length,
						succeeded,
						failed
					}, null, 2)
				}]
			}
		}
	)

	server.registerTool(
		'retry_deliveries',
		{
			description: 'Replay failed deliveries using their stored request payloads. Provide specific delivery IDs or filters to select which deliveries to retry.',
			inputSchema: {
				delivery_ids: z.array(z.string()).optional().describe('Specific delivery IDs to retry'),
				action_id: z.string().optional().describe('Filter by action ID (required when not using delivery_ids)'),
				status: z.enum(['pending', 'success', 'failed']).optional().describe('Filter by delivery status'),
				since: z.string().optional().describe('Only retry deliveries after this ISO date'),
				until: z.string().optional().describe('Only retry deliveries before this ISO date')
			}
		},
		async ({ delivery_ids, action_id, status, since, until }) => {
			let deliveries: any[]

			if (delivery_ids && delivery_ids.length > 0) {
				;[deliveries] = await automationService.listAndCountAutomationDeliveries(
					{ id: delivery_ids },
					{ take: delivery_ids.length }
				)
			} else if (action_id) {
				const filters: Record<string, unknown> = { action_id }
				if (status) filters.status = status
				if (since || until) {
					filters.created_at = {
						...(since ? { $gte: new Date(since) } : {}),
						...(until ? { $lte: new Date(until) } : {})
					}
				}
				;[deliveries] = await automationService.listAndCountAutomationDeliveries(
					filters,
					{ take: 1000, order: { created_at: 'ASC' } }
				)
			} else {
				return {
					content: [{
						type: 'text' as const,
						text: 'Provide either delivery_ids or action_id to select deliveries to retry.'
					}]
				}
			}

			if (deliveries.length === 0) {
				return { content: [{ type: 'text' as const, text: 'No matching deliveries found.' }] }
			}

			// Group by action_id and fetch each action once
			const actionIds = [...new Set(deliveries.map((d: any) => d.action_id))]
			const actionMap = new Map<string, any>()
			for (const aid of actionIds) {
				const [action] = await automationService.listAutomationActions({ id: aid }, { take: 1 })
				if (action) actionMap.set(aid, action)
			}

			let succeeded = 0
			let failed = 0

			for (const delivery of deliveries) {
				const action = actionMap.get(delivery.action_id)
				if (!action) {
					failed++
					continue
				}

				const payload = (delivery.request_payload as Record<string, unknown>) ?? {}
				const result = await dispatchAndRecord(
					scope,
					action,
					payload,
					`retry:${delivery.event_name ?? 'unknown'}`,
					{
						signOutgoing: true,
						maxWorkflowIterations: automationService.getOptions?.()?.maxWorkflowIterations
					}
				)

				if (result.status === 'success') succeeded++
				else failed++
			}

			return {
				content: [{
					type: 'text' as const,
					text: JSON.stringify({ retried: deliveries.length, succeeded, failed }, null, 2)
				}]
			}
		}
	)
}
