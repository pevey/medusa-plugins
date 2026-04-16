import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { AUTOMATION_MODULE } from '../../../../../../../../modules/automation'
import { AutomationService } from '../../../../../../../../modules/automation/service'
import { AdminRetryAutomationDeliveriesType } from '../../../../../../../validators'
import { dispatchAndRecord } from '../../../../../../../../lib/dispatch'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminRetryAutomationDeliveriesType>,
	res: MedusaResponse
) => {
	const automationService = req.scope.resolve(AUTOMATION_MODULE) as AutomationService
	const { actionId } = req.params
	const { delivery_ids, status, since, until } = req.body

	// Fetch the action to dispatch against
	const [action] = await automationService.listAutomationActions({ id: actionId }, { take: 1 })
	if (!action) {
		return res.status(404).json({ error: 'Action not found' })
	}

	// Find deliveries to retry — either by IDs or by filters
	let deliveries: any[]
	if (delivery_ids) {
		;[deliveries] = await automationService.listAndCountAutomationDeliveries(
			{ id: delivery_ids, action_id: actionId },
			{ take: delivery_ids.length }
		)
	} else {
		const filters: Record<string, unknown> = { action_id: actionId }
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
	}

	if (deliveries.length === 0) {
		return res.json({ retried: 0, succeeded: 0, failed: 0 })
	}

	const opts = {
		signOutgoing: true,
		maxWorkflowIterations: automationService.getOptions().maxWorkflowIterations
	}

	let succeeded = 0
	let failed = 0

	for (const delivery of deliveries) {
		const payload = (delivery.request_payload as Record<string, unknown>) ?? {}
		const result = await dispatchAndRecord(
			req.scope,
			action,
			payload,
			`retry:${delivery.event_name ?? 'unknown'}`,
			opts
		)
		if (result.status === 'success') {
			succeeded++
		} else {
			failed++
		}
	}

	res.json({ retried: deliveries.length, succeeded, failed })
}
