// Source: packages/mildred/src/api/validators.ts
// Routes: POST /store/ping

export interface TrackOptions {
	/** Actor ID for this event (overrides default cartId) */
	cartId?: string
	/** Event properties */
	properties?: Record<string, unknown>
	/** Session ID */
	sessionId?: string
}

export interface CollectorConfig {
	/**
	 * Same-origin URL the batched events are POSTed to (normal flush via fetch,
	 * exit flush via sendBeacon). Point this at a storefront endpoint that
	 * forwards to Medusa `/store/ping` with the publishable key. Default:
	 * `/api/analytics`.
	 *
	 * That endpoint is responsible for identity: it stamps `actor_id` from a
	 * server-managed `anonymous_id` cookie (see the SvelteKit `forwardAnalytics`
	 * helper), so the collector never sends — and can't spoof — the actor.
	 */
	endpoint?: string
	/** Flush when the queue reaches this size (default: 10) */
	batchSize?: number
	/** Flush interval in ms (default: 2000) */
	flushInterval?: number
}

// Sales channel is derived server-side from the publishable API key on the
// request, so it is intentionally not part of the client event payload.
export interface AnalyticsEvent {
	event: string
	actor_id?: string
	session_id?: string
	properties?: Record<string, unknown>
}
