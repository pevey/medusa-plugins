import type { StoreCart } from '@medusajs/types'

export type CartLine = NonNullable<StoreCart['items']>[number]

// getCart is a SvelteKit remote query — awaitable AND exposing `.current`/`.loading`/`.error`.
// Typed structurally so tests can inject a fake `{ current }`.
export type CartQuery = { current: StoreCart | null | undefined; loading?: boolean; error?: unknown }
export type GetCartFn = () => CartQuery
export type UpdateCartItemFn = (args: { item_id: string; quantity: number }) => Promise<StoreCart | null>
export type RemoveFromCartFn = (lineId: string) => Promise<StoreCart | null>
export type LineHrefFn = (item: CartLine) => string
