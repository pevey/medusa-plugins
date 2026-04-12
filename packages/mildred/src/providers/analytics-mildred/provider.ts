import { AbstractAnalyticsProviderService } from '@medusajs/framework/utils'
import type { Logger } from '@medusajs/framework/types'
import type {
	ProviderTrackAnalyticsEventDTO,
	ProviderIdentifyAnalyticsEventDTO
} from '@medusajs/types'
import type { MildredService } from '../../modules/analytics/service'

type TrackEventInput = {
	event: string
	actor_id?: string | null
	group_type?: string | null
	group_id?: string | null
	properties?: Record<string, unknown> | null
	sales_channel_id?: string | null
	session_id?: string | null
	source?: 'storefront' | 'backend'
}

const SYSTEM_RUBRICS = new Set([
	'cart_created',
	'cart_updated',
	'order_placed',
	'order_canceled',
	'order_completed',
	'shipment_created',
	'customer_created',
	'customer_updated',
	'return_requested',
	'return_received'
])

export { SYSTEM_RUBRICS }

export class MildredAnalyticsProvider extends AbstractAnalyticsProviderService {
	static identifier = 'analytics-mildred'

	private container: Record<string, unknown>
	private _storageService: MildredService | null = null
	private logger: Logger
	private buffer: TrackEventInput[] = []
	private flushTimer: NodeJS.Timeout | null = null
	private activeRubrics: Set<string> | null = null
	private rubricCacheExpiry = 0

	private readonly BATCH_SIZE = 50
	private readonly FLUSH_INTERVAL_MS = 500
	private readonly RUBRIC_CACHE_TTL_MS = 60_000

	constructor(container: Record<string, unknown>) {
		super()
		this.container = container
		this.logger = container.logger as Logger
		this.startFlushTimer()
	}

	private get storageService(): MildredService {
		if (!this._storageService) {
			this._storageService = this.container.mildred as MildredService
		}
		return this._storageService
	}

	async track(data: ProviderTrackAnalyticsEventDTO): Promise<void> {
		const allowed = await this.getActiveRubrics()
		if (!allowed.has(data.event)) {
			this.logger.warn(`Analytics: event "${data.event}" not in active rubrics, skipping`)
			return
		}

		const properties = { ...data.properties }
		const salesChannelId = properties?._sales_channel_id as string | undefined
		if (properties?._sales_channel_id) {
			delete properties._sales_channel_id
		}

		this.buffer.push({
			event: data.event,
			actor_id: data.actor_id ?? null,
			group_type: data.group?.type ?? null,
			group_id: data.group?.id ?? null,
			properties: Object.keys(properties ?? {}).length > 0 ? properties : null,
			sales_channel_id: salesChannelId ?? null
		})

		if (this.buffer.length >= this.BATCH_SIZE) {
			await this.flush()
		}
	}

	async identify(data: ProviderIdentifyAnalyticsEventDTO): Promise<void> {
		const actorId = data.actor_id ?? ('group' in data ? `${data.group.type}:${data.group.id}` : null)
		if (!actorId) {
			this.logger.warn('Analytics: identify() called without actor_id or group, skipping')
			return
		}

		const anonymousId = data.properties?.anonymous_id as string | undefined
		const customerId = data.properties?.customer_id as string | undefined

		// Strip internal fields from properties before storing
		const { anonymous_id: _, customer_id: __, ...cleanProperties } = data.properties ?? {}

		await this.storageService.identifyActor({
			actor_id: actorId,
			customer_id: customerId ?? null,
			anonymous_id: anonymousId ?? null,
			properties: Object.keys(cleanProperties).length > 0 ? cleanProperties : null
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
			await this.storageService.trackEvent(batch)
		} catch (err) {
			this.logger.error(`Analytics: failed to flush ${batch.length} events`, err as Error)
			// Put events back at the front of the buffer for retry
			this.buffer.unshift(...batch)
		}
	}

	private async getActiveRubrics(): Promise<Set<string>> {
		if (this.activeRubrics && Date.now() < this.rubricCacheExpiry) {
			return this.activeRubrics
		}

		const rubrics = await this.storageService.listAnalyticsRubrics({ active: true })
		this.activeRubrics = new Set([
			...SYSTEM_RUBRICS,
			...rubrics.map((r: { name: string }) => r.name)
		])
		this.rubricCacheExpiry = Date.now() + this.RUBRIC_CACHE_TTL_MS
		return this.activeRubrics
	}
}
