<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { page } from '$app/state'
	// Import from the /categories subpath: svelte-check cannot resolve the remotes through the
	// package barrel (the SDK's ./* export maps this straight to categories.remote).
	import { getProductCategoriesQuery } from 'sveltekit-medusa-sdk/categories'
	import { logic as pageNavLogic } from '$lib/components/ui/page-nav/index.js'
	import { setCategoriesContext } from './categories-ctx.svelte.js'
	import type { CategoriesQuery } from './categories-types.js'
	import type { StoreProductCategory } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		/** Headless mode: supply the categories yourself and this Root only paginates them. */
		categories?: StoreProductCategory[]
		/** List the children of one category — the "subcategories on a category page" case. */
		parentId?: string
		q?: string
		order?: string
		pageSize?: number
		pageParam?: string
		href?: (c: StoreProductCategory) => string
		imageKey?: string
		class?: string
		children: Snippet<[{ categories: StoreProductCategory[]; count: number; page: number; pageCount: number; loading: boolean; error: unknown }]>
	}
	let { categories, parentId, q, order, pageSize = 24, pageParam = 'p', href, imageKey = 'thumbnail', class: className = '', children }: Props = $props()

	const headless = $derived(categories !== undefined)
	const currentPage = $derived(pageNavLogic.parsePage(page.url.searchParams.get(pageParam)))

	const listQ = $derived(
		headless
			? null
			: (getProductCategoriesQuery({
					limit: pageSize,
					offset: currentPage * pageSize,
					...(parentId ? { parent_category_id: parentId } : {}),
					...(q ? { q } : {}),
					...(order ? { order } : {})
				}) as unknown as CategoriesQuery)
	)

	const visible = $derived(
		headless ? (categories ?? []).slice(currentPage * pageSize, currentPage * pageSize + pageSize) : (listQ?.current?.product_categories ?? [])
	)
	const count = $derived(headless ? (categories?.length ?? 0) : (listQ?.current?.count ?? 0))
	const pageCount = $derived(pageNavLogic.pageCount(count, pageSize))
	const loading = $derived(headless ? false : (listQ?.loading ?? false))
	const error = $derived(headless ? undefined : listQ?.error)

	setCategoriesContext({
		get categories() {
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
		href: c => (href ? href(c) : `/categories/${c.handle}`),
		get imageKey() {
			return imageKey
		}
	})
</script>

<div class={cn('', className)} data-categories>
	{@render children({ categories: visible, count, page: currentPage, pageCount, loading, error })}
</div>
