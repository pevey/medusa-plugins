<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { page } from '$app/state'
	// Import from the /products subpath: svelte-check cannot resolve the remotes through the
	// package barrel (the SDK's ./* export maps this straight to products.remote).
	import { getProductsQuery } from 'sveltekit-medusa-sdk/products'
	import { logic as pageNavLogic } from '$lib/components/ui/page-nav/index.js'
	import { setProductsContext } from './products-ctx.svelte.js'
	import type { ProductsQuery } from './products-types.js'
	import type { StoreProduct } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		/** Headless mode: supply the products yourself and this Root only paginates them. */
		products?: StoreProduct[]
		categoryId?: string | string[]
		collectionId?: string | string[]
		typeId?: string | string[]
		q?: string
		order?: string
		pageSize?: number
		pageParam?: string
		href?: (p: StoreProduct) => string
		class?: string
		children: Snippet<[{ products: StoreProduct[]; count: number; page: number; pageCount: number; loading: boolean; error: unknown }]>
	}
	let { products, categoryId, collectionId, typeId, q, order, pageSize = 12, pageParam = 'p', href, class: className = '', children }: Props = $props()

	const headless = $derived(products !== undefined)
	// The page lives in the URL (1-based param, 0-based index) so page 2 of a category is
	// linkable and crawlable.
	const currentPage = $derived(pageNavLogic.parsePage(page.url.searchParams.get(pageParam)))

	// Read through `.current` rather than `await` so changing page swaps the grid in place
	// instead of suspending the whole route.
	const listQ = $derived(
		headless
			? null
			: (getProductsQuery({
					limit: pageSize,
					offset: currentPage * pageSize,
					...(categoryId ? { category_id: categoryId } : {}),
					...(collectionId ? { collection_id: collectionId } : {}),
					...(typeId ? { type_id: typeId } : {}),
					...(q ? { q } : {}),
					...(order ? { order } : {})
				}) as unknown as ProductsQuery)
	)

	const visible = $derived(headless ? (products ?? []).slice(currentPage * pageSize, currentPage * pageSize + pageSize) : (listQ?.current?.products ?? []))
	const count = $derived(headless ? (products?.length ?? 0) : (listQ?.current?.count ?? 0))
	const pageCount = $derived(pageNavLogic.pageCount(count, pageSize))
	const loading = $derived(headless ? false : (listQ?.loading ?? false))
	const error = $derived(headless ? undefined : listQ?.error)

	setProductsContext({
		get products() {
			return visible
		},
		get count() {
			return count
		},
		get page() {
			return currentPage
		},
		get pageCount() {
			return pageCount
		},
		get pageSize() {
			return pageSize
		},
		get pageParam() {
			return pageParam
		},
		get loading() {
			return loading
		},
		get error() {
			return error
		},
		href: p => (href ? href(p) : `/products/${p.handle}`)
	})
</script>

<div class={cn('', className)} data-products>
	{@render children({ products: visible, count, page: currentPage, pageCount, loading, error })}
</div>
