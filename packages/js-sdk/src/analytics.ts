// Source: packages/mildred/src/api/validators.ts
// Routes: POST /store/ping

import type { Client } from '@medusajs/js-sdk'
import type { AnalyticsConfig, AnalyticsEvent, TrackOptions } from './types/analytics'

const ENDPOINT = '/store/ping'

export class Analytics {
	private client: Client
	private salesChannelId?: string
	private cartId?: string
	private batchSize: number
	private flushIntervalMs: number
	private isBrowser: boolean
	private queue: AnalyticsEvent[] = []
	private timer: ReturnType<typeof setInterval> | null = null
	private flushing = false

	constructor(client: Client, config?: AnalyticsConfig) {
		this.client = client
		this.salesChannelId = config?.salesChannelId
		this.cartId = config?.cartId
		this.batchSize = config?.batchSize ?? 10
		this.flushIntervalMs = config?.flushInterval ?? 2000
		this.isBrowser = typeof window !== 'undefined'

		if (this.isBrowser) {
			this.startFlushTimer()
			this.bindUnloadHandler()
		}
	}

	/**
	 * Track an analytics event.
	 *
	 * Browser: queues the event and flushes when batch is full or on interval.
	 * Server: sends immediately.
	 */
	track(event: string, options?: TrackOptions): void {
		const payload: AnalyticsEvent = {
			event,
			actor_id: options?.cartId ?? this.cartId,
			session_id: options?.sessionId,
			properties: options?.properties,
			sales_channel_id: options?.salesChannelId ?? this.salesChannelId
		}

		if (this.isBrowser) {
			this.queue.push(payload)
			if (this.queue.length >= this.batchSize) {
				void this.flush()
			}
		} else {
			void this.send(payload)
		}
	}

	/**
	 * Identify an actor. Sends a special `_identify` event that the backend
	 * routes to `analyticsService.identify()`.
	 */
	identify(actorId: string, properties?: Record<string, unknown>): void {
		const payload: AnalyticsEvent = {
			event: '_identify',
			actor_id: actorId,
			properties: {
				...properties,
				anonymous_id: this.cartId
			},
			sales_channel_id: this.salesChannelId
		}

		if (this.isBrowser) {
			this.queue.push(payload)
			void this.flush()
		} else {
			void this.send(payload)
		}
	}

	/** Update the default actor ID (typically when cart is created/loaded). */
	setCartId(cartId: string): void {
		this.cartId = cartId
	}

	/** Update the default sales channel ID. */
	setSalesChannelId(salesChannelId: string): void {
		this.salesChannelId = salesChannelId
	}

	/** Flush all queued events immediately. */
	async flush(): Promise<void> {
		if (this.flushing || this.queue.length === 0) return
		this.flushing = true

		const batch = this.queue.splice(0)

		try {
			await Promise.all(batch.map(event => this.send(event)))
		} catch {
			this.queue.unshift(...batch)
		} finally {
			this.flushing = false
		}
	}

	/** Stop the flush timer and flush remaining events. Call on cleanup. */
	async destroy(): Promise<void> {
		if (this.timer) {
			clearInterval(this.timer)
			this.timer = null
		}
		await this.flush()
	}

	private async send(payload: AnalyticsEvent): Promise<void> {
		await this.client.fetch(ENDPOINT, {
			method: 'POST',
			body: payload as unknown as Record<string, unknown>
		})
	}

	private startFlushTimer(): void {
		this.timer = setInterval(() => {
			void this.flush()
		}, this.flushIntervalMs)
	}

	private bindUnloadHandler(): void {
		if (typeof document === 'undefined') return

		const onUnload = () => {
			if (this.queue.length === 0) return

			if (typeof navigator?.sendBeacon === 'function') {
				const batch = this.queue.splice(0)
				for (const event of batch) {
					const blob = new Blob([JSON.stringify(event)], {
						type: 'application/json'
					})
					navigator.sendBeacon(ENDPOINT, blob)
				}
			}
		}

		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') {
				onUnload()
			}
		})
	}
}
