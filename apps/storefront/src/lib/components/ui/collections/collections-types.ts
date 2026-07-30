import type { StoreCollection } from '@medusajs/types'

// Shape of the SDK's collection list envelope, and of the remote-query object the components
// read (reading `.current`/`.loading` off the remote requires the cast in the Root).
export type CollectionListResult = {
	collections: StoreCollection[]
	count: number
	limit: number
	offset: number
}

export type CollectionsQuery = {
	current?: CollectionListResult
	loading?: boolean
	error?: unknown
}
