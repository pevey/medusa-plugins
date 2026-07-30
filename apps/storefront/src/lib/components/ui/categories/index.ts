import Root from './categories-root.svelte'
import Grid from './categories-grid.svelte'
import Card from './categories-card.svelte'
import PaginationRoot from './categories-pagination.svelte'
import { Prev, Next, Pages, Info } from '$lib/components/ui/page-nav/index.js'

// Callable as <Categories.Pagination /> or composed as <Categories.Pagination><Categories.Pagination.Prev />…
// The parts are page-nav's; we assign onto our own wrapper, never onto the shared page-nav
// components themselves.
const Pagination = Object.assign(PaginationRoot, { Root: PaginationRoot, Prev, Next, Pages, Info })

export { Root, Grid, Card, Pagination }
export { getCategoriesContext, setCategoriesContext } from './categories-ctx.svelte.js'
export type { CategoriesContext } from './categories-ctx.svelte.js'
export type { CategoryListResult, CategoriesQuery } from './categories-types.js'
