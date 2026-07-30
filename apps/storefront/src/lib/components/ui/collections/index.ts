import Root from './collections-root.svelte'
import Grid from './collections-grid.svelte'
import Card from './collections-card.svelte'
import PaginationRoot from './collections-pagination.svelte'
import { Prev, Next, Pages, Info } from '$lib/components/ui/page-nav/index.js'

// Callable as <Collections.Pagination /> or composed as <Collections.Pagination><Collections.Pagination.Prev />…
// The parts are page-nav's; we assign onto our own wrapper, never onto the shared page-nav
// components themselves.
const Pagination = Object.assign(PaginationRoot, { Root: PaginationRoot, Prev, Next, Pages, Info })

export { Root, Grid, Card, Pagination }
export { getCollectionsContext, setCollectionsContext } from './collections-ctx.svelte.js'
export type { CollectionsContext } from './collections-ctx.svelte.js'
export type { CollectionListResult, CollectionsQuery } from './collections-types.js'
