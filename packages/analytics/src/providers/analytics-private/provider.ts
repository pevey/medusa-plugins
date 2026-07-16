import { AbstractAnalyticsProviderService } from '@medusajs/framework/utils'
import type { Logger } from '@medusajs/framework/types'
import type {
	ProviderTrackAnalyticsEventDTO,
	ProviderIdentifyAnalyticsEventDTO
} from '@medusajs/types'
import { trackEventsWorkflow } from '../../workflows/analytics/track-event'
import { identifyActorWorkflow } from '../../workflows/analytics/identify-actor'

type BufferedEvent = {
	event: string
	actor_id?: string | null
	group_type?: string | null
	group_id?: string | null
	properties?: Record<string, unknown> | null
	sales_channel_id?: string | null
	source?: 'storefront' | 'backend'
}

/**
 * Standard Medusa analytics provider that keeps events INSIDE Medusa instead of
 * forwarding to a third party. A provider runs in the analytics module's isolated
 * container and cannot resolve the sibling `private_analytics` storage module, so
 * persistence is delegated to workflows invoked WITHOUT a container — the
 * workflows-sdk then falls back to the global module registry, where the storage
 * module is reachable. This provider's own job is buffering: it coalesces the
 * high-volume storefront stream (and core-flow events) into batched bulk inserts.
 */
export class PrivateAnalyticsProvider extends AbstractAnalyticsProviderService {
	static identifier = 'private'

	private logger: Logger
	private buffer: BufferedEvent[] = []
	private flushTimer: NodeJS.Timeout | null = null

	private readonly BATCH_SIZE = 50
	private readonly FLUSH_INTERVAL_MS = 500

	constructor(container: Record<string, unknown>) {
		super()
		this.logger = container.logger as Logger
		this.startFlushTimer()
	}

	async track(data: ProviderTrackAnalyticsEventDTO): Promise<void> {
		const properties = { ...data.properties }

		// Server-derived fields the route passes through properties.
		const salesChannelId = properties?._sales_channel_id as string | undefined
		delete properties._sales_channel_id
		const source = properties?._source as 'storefront' | 'backend' | undefined
		delete properties._source

		this.buffer.push({
			event: data.event,
			actor_id: data.actor_id ?? null,
			group_type: data.group?.type ?? null,
			group_id: data.group?.id ?? null,
			properties: Object.keys(properties).length > 0 ? properties : null,
			sales_channel_id: salesChannelId ?? null,
			source: source ?? 'backend'
		})

		if (this.buffer.length >= this.BATCH_SIZE) {
			await this.flush()
		}
	}

	async identify(data: ProviderIdentifyAnalyticsEventDTO): Promise<void> {
		const actorId =
			data.actor_id ?? ('group' in data ? `${data.group.type}:${data.group.id}` : null)
		if (!actorId) {
			this.logger.warn('Analytics: identify() called without actor_id or group, skipping')
			return
		}

		const anonymousId = data.properties?.anonymous_id as string | undefined
		const customerId = data.properties?.customer_id as string | undefined

		// Strip internal fields from properties before storing
		const { anonymous_id: _, customer_id: __, ...cleanProperties } = data.properties ?? {}

		await identifyActorWorkflow().run({
			input: {
				actor_id: actorId,
				customer_id: customerId ?? null,
				anonymous_id: anonymousId ?? null,
				properties: Object.keys(cleanProperties).length > 0 ? cleanProperties : null
			}
		})
	}

	async shutdown(): Promise<void> {
		if (this.flushTimer) {
			clearInterval(this.flushTimer)
			this.flushTimer = null
		}
		await this.flush()
	}

	private startFlushTimer() {
		this.flushTimer = setInterval(() => {
			if (this.buffer.length > 0) {
				this.flush().catch(err => {
					this.logger.error('Analytics: flush failed', err)
				})
			}
		}, this.FLUSH_INTERVAL_MS)
	}

	private async flush(): Promise<void> {
		if (this.buffer.length === 0) return

		const batch = this.buffer.splice(0)
		try {
			await trackEventsWorkflow().run({ input: { events: batch } })
		} catch (err) {
			this.logger.error(`Analytics: failed to flush ${batch.length} events`, err as Error)
			// Put events back at the front of the buffer for retry
			this.buffer.unshift(...batch)
		}
	}
}
