import { createWorkflow, WorkflowResponse, createStep, StepResponse } from '@medusajs/framework/workflows-sdk'
import { PRIVATE_ANALYTICS_MODULE } from '../../modules/analytics'
import type { PrivateAnalyticsService } from '../../modules/analytics/service'

type TrackEventInput = {
	event: string
	actor_id?: string | null
	group_type?: string | null
	group_id?: string | null
	properties?: Record<string, unknown> | null
	session_id?: string | null
	source?: 'storefront' | 'backend'
	sales_channel_id?: string | null
}

const trackEventStep = createStep('track-event-step', async (input: TrackEventInput, { container }) => {
	const service = container.resolve(PRIVATE_ANALYTICS_MODULE) as PrivateAnalyticsService
	await service.trackEvent(input)
	return new StepResponse(undefined)
})

export const trackEventWorkflow = createWorkflow('track-event-workflow', function (input: TrackEventInput) {
	trackEventStep(input)
	return new WorkflowResponse(undefined)
})

const trackEventsStep = createStep('track-events-step', async (input: { events: TrackEventInput[] }, { container }) => {
	const service = container.resolve(PRIVATE_ANALYTICS_MODULE) as PrivateAnalyticsService
	await service.trackEvent(input.events)
	return new StepResponse(undefined)
})

export const trackEventsWorkflow = createWorkflow('track-events-workflow', function (input: { events: TrackEventInput[] }) {
	trackEventsStep(input)
	return new WorkflowResponse(undefined)
})
