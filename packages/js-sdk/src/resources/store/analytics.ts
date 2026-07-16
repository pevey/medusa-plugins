// Source: packages/analytics/src/api/store/ping/ + packages/analytics/src/api/validators.ts
// Routes: POST /store/ping (accepts a single event or an array)

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type { AnalyticsEvent } from '../../types/analytics'

export function createStoreAnalyticsResource(client: Client) {
	return {
		/**
		 * Send one event or a batch of events to `/store/ping`. Stateless — the
		 * batching client (`createCollector`) and server-side forwarders
		 * build on this.
		 */
		track: async (
			events: AnalyticsEvent | AnalyticsEvent[],
			headers?: ClientHeaders,
		) => {
			return client.fetch<{ tracked: boolean; count: number }>(
				`/store/ping`,
				{ method: 'POST', body: events as unknown as Record<string, unknown>, headers },
			)
		},
	}
}
