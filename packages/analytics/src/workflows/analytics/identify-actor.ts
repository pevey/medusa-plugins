import {
	createWorkflow,
	WorkflowResponse,
	createStep,
	StepResponse
} from '@medusajs/framework/workflows-sdk'
import { PRIVATE_ANALYTICS_MODULE } from '../../modules/analytics'
import type { PrivateAnalyticsService } from '../../modules/analytics/service'

type IdentifyActorInput = {
	actor_id: string
	anonymous_id?: string | null
	customer_id?: string | null
	properties?: Record<string, unknown> | null
}

const identifyActorStep = createStep(
	'identify-actor-step',
	async (input: IdentifyActorInput, { container }) => {
		const service = container.resolve(PRIVATE_ANALYTICS_MODULE) as PrivateAnalyticsService

		await service.identifyActor({
			actor_id: input.actor_id,
			customer_id: input.customer_id ?? null,
			anonymous_id: input.anonymous_id ?? null,
			properties: input.properties ?? null
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
