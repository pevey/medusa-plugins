/**
 * Duck-typed client interface compatible with the Medusa JS SDK client.
 * Accepts any object with a `fetch` method matching the SDK's signature.
 */
export interface MildredClient {
	fetch: (
		path: string,
		options?: {
			method?: string
			body?: Record<string, unknown>
			headers?: Record<string, string>
		}
	) => Promise<unknown>
}

export interface MildredOptions {
	/** Medusa JS SDK client instance (or any object with a compatible `fetch` method) */
	client: MildredClient
	/** Default sales channel ID attached to all events */
	salesChannelId?: string
	/** Default actor ID (typically cart ID from cookie) */
	cartId?: string
	/** Client-side only: flush when batch reaches this size (default: 10) */
	batchSize?: number
	/** Client-side only: flush interval in ms (default: 2000) */
	flushInterval?: number
}

export interface TrackOptions {
	/** Actor ID for this event (overrides default cartId) */
	cartId?: string
	/** Event properties */
	properties?: Record<string, unknown>
	/** Session ID */
	sessionId?: string
	/** Sales channel ID (overrides default) */
	salesChannelId?: string
}

interface QueuedEvent {
	event: string
	actor_id?: string
	session_id?: string
	properties?: Record<string, unknown>
	sales_channel_id?: string
}

const ENDPOINT = '/store/ping'

export class Mildred {
	private client: MildredClient
	private salesChannelId?: string
	private cartId?: string
	private batchSize: number
	private flushIntervalMs: number
	private isBrowser: boolean
	private queue: QueuedEvent[] = []
	private timer: ReturnType<typeof setInterval> | null = null
	private flushing = false

	constructor(options: MildredOptions) {
		this.client = options.client
		this.salesChannelId = options.salesChannelId
		this.cartId = options.cartId
		this.batchSize = options.batchSize ?? 10
		this.flushIntervalMs = options.flushInterval ?? 2000
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
		const payload: QueuedEvent = {
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
		const payload: QueuedEvent = {
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
			// Re-queue failed events at the front
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

	private async send(payload: QueuedEvent): Promise<void> {
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

			// Use sendBeacon for reliability on page unload
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

export default Mildred
