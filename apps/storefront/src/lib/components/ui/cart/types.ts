import type { StoreCart } from '@medusajs/types'

export type CartLine = NonNullable<StoreCart['items']>[number]

export type CartQuery = {
	current: StoreCart | null | undefined
	loading?: boolean
	error?: unknown
}
export type LineHrefFn = (item: CartLine) => string
