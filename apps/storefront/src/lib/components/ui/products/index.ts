import Root from './products-root.svelte'
import Grid from './products-grid.svelte'
import PaginationRoot from './products-pagination.svelte'
import { Prev, Next, Pages, Info } from '$lib/components/ui/page-nav/index.js'

// Callable as <Products.Pagination /> or composed as <Products.Pagination><Products.Pagination.Prev />…
// The parts are page-nav's; we assign onto our own wrapper, never onto the shared page-nav
// components themselves.
const Pagination = Object.assign(PaginationRoot, { Root: PaginationRoot, Prev, Next, Pages, Info })

export { Root, Grid, Pagination }
export { getProductsContext, setProductsContext } from './products-ctx.svelte.js'
export type { ProductsContext } from './products-ctx.svelte.js'
export type { ProductListResult, ProductsQuery } from './products-types.js'
