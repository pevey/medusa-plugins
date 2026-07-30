<script lang="ts">
	import { cn } from '$lib/utils.js'
	import { page } from '$app/state'
	// Import from the /collections subpath: svelte-check cannot resolve the remotes through the
	// package barrel (the SDK's ./* export maps this straight to collections.remote).
	import { getCollectionsQuery } from 'sveltekit-medusa-sdk/collections'
	import { logic as pageNavLogic } from '$lib/components/ui/page-nav/index.js'
	import { setCollectionsContext } from './collections-ctx.svelte.js'
	import type { CollectionsQuery } from './collections-types.js'
	import type { StoreCollection } from '@medusajs/types'
	import type { Snippet } from 'svelte'

	interface Props {
		/** Headless mode: supply the collections yourself and this Root only paginates them. */
		collections?: StoreCollection[]
		q?: string
		order?: string
		pageSize?: number
		pageParam?: string
		href?: (c: StoreCollection) => string
		imageKey?: string
		class?: string
		children: Snippet<[{ collections: StoreCollection[]; count: number; page: number; pageCount: number; loading: boolean; error: unknown }]>
	}
	let { collections, q, order, pageSize = 24, pageParam = 'p', href, imageKey = 'thumbnail', class: className = '', children }: Props = $props()

	const headless = $derived(collections !== undefined)
	const currentPage = $derived(pageNavLogic.parsePage(page.url.searchParams.get(pageParam)))

	const listQ = $derived(
		headless
			? null
			: (getCollectionsQuery({
					limit: pageSize,
					offset: currentPage * pageSize,
					...(q ? { q } : {}),
					...(order ? { order } : {})
				}) as unknown as CollectionsQuery)
	)

	const visible = $derived(
		headless ? (collections ?? []).slice(currentPage * pageSize, currentPage * pageSize + pageSize) : (listQ?.current?.collections ?? [])
	)
	const count = $derived(headless ? (collections?.length ?? 0) : (listQ?.current?.count ?? 0))
	const pageCount = $derived(pageNavLogic.pageCount(count, pageSize))
	const loading = $derived(headless ? false : (listQ?.loading ?? false))
	const error = $derived(headless ? undefined : listQ?.error)

	setCollectionsContext({
		get collections() {
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
		href: c => (href ? href(c) : `/collections/${c.handle}`),
		get imageKey() {
			return imageKey
		}
	})
</script>

<div class={cn('', className)} data-collections>
	{@render children({ collections: visible, count, page: currentPage, pageCount, loading, error })}
</div>
