import { getContext, setContext } from 'svelte'
import type { StoreProductCategory } from '@medusajs/types'

export type CategoriesContext = {
	readonly categories: StoreProductCategory[]
	readonly count: number
	readonly page: number
	readonly pageCount: number
	readonly pageSize: number
	readonly pageParam: string
	readonly loading: boolean
	readonly error: unknown
	href: (c: StoreProductCategory) => string
	readonly imageKey: string
}

const KEY = Symbol('categories')

export function setCategoriesContext(ctx: CategoriesContext) {
	setContext(KEY, ctx)
}

export function getCategoriesContext(): CategoriesContext {
	const ctx = getContext<CategoriesContext>(KEY)
	if (!ctx) throw new Error('Categories.* must be used within <Categories.Root>')
	return ctx
}
