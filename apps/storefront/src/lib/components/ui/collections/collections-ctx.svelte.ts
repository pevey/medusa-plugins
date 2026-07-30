import { getContext, setContext } from 'svelte'
import type { StoreCollection } from '@medusajs/types'

export type CollectionsContext = {
	readonly collections: StoreCollection[]
	readonly count: number
	readonly page: number
	readonly pageCount: number
	readonly pageSize: number
	readonly pageParam: string
	readonly loading: boolean
	readonly error: unknown
	href: (c: StoreCollection) => string
	readonly imageKey: string
}

const KEY = Symbol('collections')

export function setCollectionsContext(ctx: CollectionsContext) {
	setContext(KEY, ctx)
}

export function getCollectionsContext(): CollectionsContext {
	const ctx = getContext<CollectionsContext>(KEY)
	if (!ctx) throw new Error('Collections.* must be used within <Collections.Root>')
	return ctx
}
