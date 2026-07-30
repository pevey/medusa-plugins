import { getContext, setContext } from 'svelte'
import type { StoreProduct } from '@medusajs/types'

export type ProductsContext = {
	readonly products: StoreProduct[]
	readonly count: number
	readonly page: number
	readonly pageCount: number
	readonly pageSize: number
	readonly pageParam: string
	readonly loading: boolean
	readonly error: unknown
	href: (p: StoreProduct) => string
}

const KEY = Symbol('products')

export function setProductsContext(ctx: ProductsContext) {
	setContext(KEY, ctx)
}

export function getProductsContext(): ProductsContext {
	const ctx = getContext<ProductsContext>(KEY)
	if (!ctx) throw new Error('Products.* must be used within <Products.Root>')
	return ctx
}
