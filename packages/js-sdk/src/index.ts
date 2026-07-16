import { Client, Auth } from '@medusajs/js-sdk'
import type { Config } from '@medusajs/js-sdk'
import { Store } from './store'
import { Admin } from './admin'
import type { AnalyticsEvent, CollectorConfig, TrackOptions } from './types/analytics'

export interface MedusaConfig extends Config {}

export default class Medusa {
	public client: Client
	public store: Store
	public admin: Admin
	public auth: Auth

	constructor(config: MedusaConfig) {
		this.client = new Client(config)
		this.store = new Store(this.client)
		this.admin = new Admin(this.client)
		this.auth = new Auth(this.client, config)
	}

	setLocale(locale: string) {
		this.client.setLocale(locale)
	}

	getLocale() {
		return this.client.locale
	}
}

// ---------------------------------------------------------------------------
// Framework-agnostic browser event batcher. Queues events and POSTs them in
// batches to a same-origin `endpoint` — normal flushes via `fetch` (keepalive),
// exit flushes via `sendBeacon` on the `visibilitychange → hidden` transition.
// That endpoint is a storefront route that forwards to Medusa `/store/ping` with
// the publishable key AND stamps identity (`actor_id`) from a server-managed
// `anonymous_id` cookie (see the SvelteKit `forwardAnalytics` helper). The
// collector therefore never sends the actor — identity is server-owned, stable
// across carts/orders, and unspoofable. Self-managing: it starts its timer and
// binds the unload handler on creation, so it works without any UI component.
// ---------------------------------------------------------------------------

export interface Collector {
	/** Queue an event; flushes when the batch fills. */
	track(event: string, options?: TrackOptions): void
	/** Attach traits to the current (anonymous) visitor's identity and flush. */
	setTraits(traits: Record<string, unknown>): void
	/** Flush the queue now (via fetch). */
	flush(): Promise<void>
	/** Stop timers/handlers and flush any remainder. */
	destroy(): Promise<void>
}

export function createCollector(config: CollectorConfig = {}): Collector {
	const endpoint = config.endpoint ?? '/api/ping'
	const batchSize = config.batchSize ?? 10
	const flushIntervalMs = config.flushInterval ?? 2000
	const isBrowser = typeof window !== 'undefined'

	let queue: AnalyticsEvent[] = []
	let timer: ReturnType<typeof setInterval> | null = null
	let flushing = false

	function track(event: string, options?: TrackOptions): void {
		// No actor_id — the forwarding endpoint stamps it from the anonymous_id cookie.
		queue.push({
			event,
			session_id: options?.sessionId,
			properties: options?.properties
		})
		if (queue.length >= batchSize) {
			void flush()
		}
	}

	function setTraits(traits: Record<string, unknown>): void {
		// An `_identify` with no customer_id → backend upserts these traits onto the
		// anonymous identity. actor_id is stamped by the forwarding endpoint.
		queue.push({ event: '_identify', properties: traits })
		void flush()
	}

	async function flush(): Promise<void> {
		if (flushing || queue.length === 0) return
		flushing = true
		const batch = queue.splice(0)
		try {
			await fetch(endpoint, {
				method: 'POST',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify(batch),
				keepalive: true
			})
		} catch {
			queue.unshift(...batch)
		} finally {
			flushing = false
		}
	}

	function beaconFlush(): void {
		if (queue.length === 0) return
		const batch = queue.splice(0)
		const blob = new Blob([JSON.stringify(batch)], { type: 'application/json' })
		const sent =
			typeof navigator !== 'undefined' &&
			typeof navigator.sendBeacon === 'function' &&
			navigator.sendBeacon(endpoint, blob)
		if (!sent) {
			// Best effort: requeue and let the next fetch flush pick it up.
			queue.unshift(...batch)
		}
	}

	function onVisibilityChange(): void {
		if (document.visibilityState === 'hidden') {
			beaconFlush()
		}
	}

	async function destroy(): Promise<void> {
		if (timer) {
			clearInterval(timer)
			timer = null
		}
		if (isBrowser) {
			document.removeEventListener('visibilitychange', onVisibilityChange)
		}
		await flush()
	}

	if (isBrowser) {
		timer = setInterval(() => void flush(), flushIntervalMs)
		document.addEventListener('visibilitychange', onVisibilityChange)
	}

	return { track, setTraits, flush, destroy }
}

// Re-export types for consumers
export { Store } from './store'
export { Admin } from './admin'
export { Client, Auth, FetchError } from '@medusajs/js-sdk'
export type {
	Config,
	ClientHeaders,
	FetchArgs,
	FetchInput,
	FetchStreamResponse,
	Logger
} from '@medusajs/js-sdk'
export * from './types'
