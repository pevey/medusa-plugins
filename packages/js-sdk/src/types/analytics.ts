// Source: packages/mildred/src/api/validators.ts
// Routes: POST /store/ping

export interface AnalyticsConfig {
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

export interface AnalyticsEvent {
	event: string
	actor_id?: string
	session_id?: string
	properties?: Record<string, unknown>
	sales_channel_id?: string
}
