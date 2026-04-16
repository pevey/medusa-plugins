import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'

type TrackEventInput = {
	event: string
	actor_id?: string | null
	group_type?: string | null
	group_id?: string | null
	properties?: Record<string, unknown> | null
	sales_channel_id?: string | null
}

const trackEventStep = createStep(
	'track-event-step',
	async (input: TrackEventInput, { container }) => {
		const analyticsService = container.resolve(Modules.ANALYTICS)
		await analyticsService.track({
			event: input.event,
			actor_id: input.actor_id ?? undefined,
			properties: {
				...input.properties,
				...(input.sales_channel_id ? { _sales_channel_id: input.sales_channel_id } : {})
			},
			...(input.group_type && input.group_id
				? { group: { type: input.group_type, id: input.group_id } }
				: {})
		})
		return new StepResponse(undefined)
	}
)

export const trackEventWorkflow = createWorkflow(
	'track-event-workflow',
	function (input: TrackEventInput) {
		trackEventStep(input)
		return new WorkflowResponse(undefined)
	}
)
