import type { StoreProduct } from '@medusajs/types'

// Shape of the SDK's product list envelope, and of the remote-query object the components
// read. `getProductsQuery` is typed as an async function; reading `.current`/`.loading` off it
// requires this cast (the same pattern reviews-root.svelte uses).
export type ProductListResult = {
	products: StoreProduct[]
	count: number
	limit: number
	offset: number
}

export type ProductsQuery = {
	current?: ProductListResult
	loading?: boolean
	error?: unknown
}
