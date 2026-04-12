import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'

type IdentifyActorInput = {
	actor_id: string
	anonymous_id?: string | null
	customer_id?: string | null
	properties?: Record<string, unknown> | null
}

const identifyActorStep = createStep(
	'identify-actor-step',
	async (input: IdentifyActorInput, { container }) => {
		const analyticsService = container.resolve(Modules.ANALYTICS)

		await analyticsService.identify({
			actor_id: input.actor_id,
			properties: {
				...(input.properties ?? {}),
				...(input.customer_id ? { customer_id: input.customer_id } : {}),
				...(input.anonymous_id ? { anonymous_id: input.anonymous_id } : {})
			}
		})
		return new StepResponse(undefined)
	}
)

export const identifyActorWorkflow = createWorkflow(
	'identify-actor-workflow',
	function (input: IdentifyActorInput) {
		identifyActorStep(input)
		return new WorkflowResponse(undefined)
	}
)
