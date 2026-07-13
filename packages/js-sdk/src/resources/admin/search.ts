// Source: packages/search/src/api/admin/search/reindex/route.ts
// Routes: POST /admin/search/reindex

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type { AdminSearchReindexResponse } from '../../types/search'

export function createAdminSearchResource(client: Client) {
	return {
		reindex: async (headers?: ClientHeaders) => {
			return client.fetch<AdminSearchReindexResponse>(`/admin/search/reindex`, {
				method: 'POST',
				headers,
			})
		},
	}
}
