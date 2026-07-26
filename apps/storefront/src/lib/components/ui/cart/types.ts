import type { StoreCart } from '@medusajs/types'

export type CartLine = NonNullable<StoreCart['items']>[number]

// getCart is a SvelteKit remote query — awaitable AND exposing `.current`/`.loading`/`.error`.
// The Root bridges the SDK's under-resolved return type to this shape.
export type CartQuery = { current: StoreCart | null | undefined; loading?: boolean; error?: unknown }
export type LineHrefFn = (item: CartLine) => string
