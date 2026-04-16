// Listens to every standard Medusa event (trigger_type === 'medusa_event') and
// dispatches all active actions for each matching trigger.
import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AUTOMATION_MODULE } from '../modules/automation'
import { AutomationService } from '../modules/automation/service'
import { AutomationTriggerType } from '../modules/automation/models/automation-trigger'
import { MEDUSA_EVENTS } from '../admin/lib/medusa-events'
import { augmentWithQuery, dispatchAndRecord } from '../lib/dispatch'

export default async function automationDispatchHandler({
	event: { name: eventName, data: eventData },
	container
}: SubscriberArgs<Record<string, unknown>>) {
	const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
	const automationService = container.resolve(AUTOMATION_MODULE) as AutomationService

	let triggers: any[]
	try {
		;[triggers] = await automationService.listAndCountAutomationTriggers({
			trigger_type: AutomationTriggerType.MEDUSA_EVENT,
			is_active: true
		})
	} catch (err) {
		logger.error(
			`automation-dispatcher: failed to list triggers for ${eventName}: ${err instanceof Error ? err.message : JSON.stringify(err)}`
		)
		return
	}

	const matchingTriggers = triggers.filter(trigger => {
		const events: string[] = Array.isArray(trigger.trigger_events) ? trigger.trigger_events : []
		return events.includes(eventName)
	})

	if (matchingTriggers.length === 0) return

	const opts = {
		signOutgoing: true,
		maxWorkflowIterations: automationService.getOptions().maxWorkflowIterations
	}

	await Promise.allSettled(
		matchingTriggers.map(async trigger => {
			const [actions] = await automationService.listAndCountAutomationActions({
				trigger_id: trigger.id,
				is_active: true
			})

			await Promise.allSettled(
				actions.map(async action => {
					// Step 1: Optionally augment event data with a query
					const sourceData = await augmentWithQuery(
						container,
						automationService,
						action.id,
						eventData as Record<string, unknown>
					)

					// Step 2: Dispatch the action and record the delivery
					await dispatchAndRecord(container, action, sourceData, eventName, opts)
				})
			)
		})
	)
}

export const config: SubscriberConfig = {
	event: MEDUSA_EVENTS.map(e => e.name)
}
