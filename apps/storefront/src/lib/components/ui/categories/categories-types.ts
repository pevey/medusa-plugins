import type { StoreProductCategory } from '@medusajs/types'

// Shape of the SDK's category list envelope, and of the remote-query object the components
// read (reading `.current`/`.loading` off the remote requires the cast in the Root).
export type CategoryListResult = {
	product_categories: StoreProductCategory[]
	count: number
	limit: number
	offset: number
}

export type CategoriesQuery = {
	current?: CategoryListResult
	loading?: boolean
	error?: unknown
}
