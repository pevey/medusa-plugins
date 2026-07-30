import { SvelteURLSearchParams } from 'svelte/reactivity'

// Pagination math. No $app, no components — unit-testable.
//
// Two number spaces, deliberately: the URL param is 1-based (`?page=2` is the second page,
// which is what a human or a crawler expects), while every internal `page` value is a 0-based
// index. `parsePage` converts in, `buildPageHref` converts out. Page 0 omits the param so the
// first page has exactly one canonical URL.

/** Number of pages for a result count at a given page size. */
export function pageCount(count: number, pageSize: number): number {
	return pageSize > 0 ? Math.ceil((count || 0) / pageSize) : 0
}

/** 1-based URL param → 0-based index. Missing/garbage/≤1 all mean the first page. */
export function parsePage(raw: string | null): number {
	const n = parseInt(raw ?? '', 10)
	return Number.isFinite(n) && n > 1 ? n - 1 : 0
}

/**
 * The bit of a URL this needs. Deliberately structural rather than `URL`: SvelteKit's
 * `page.url` is readonly (its `searchParams` is a `ReadonlyURLSearchParams`), so requiring a
 * real `URL` fails to typecheck in a consuming app.
 */
export type PageUrl = { pathname: string; searchParams: { toString(): string } }

/**
 * Href for a 0-based page index, preserving every other search param.
 *
 * Copies into a `SvelteURLSearchParams` (never mutates the caller's params) so that reading
 * `page.url.searchParams` registers the dependency and callers get a fresh href per link.
 */
export function buildPageHref(url: PageUrl, pageParam: string, page: number): string {
	const sp = new SvelteURLSearchParams(url.searchParams.toString())
	if (page <= 0) sp.delete(pageParam)
	else sp.set(pageParam, String(page + 1))
	const q = sp.toString()
	return q ? `${url.pathname}?${q}` : url.pathname
}

/**
 * The page indices to render, with `'ellipsis'` markers for elided runs: always the first and
 * last page, plus `span` pages either side of the current one.
 */
export function pageWindow(page: number, pageCount: number, span = 1): (number | 'ellipsis')[] {
	if (pageCount <= 0) return []
	const first = 0
	const last = pageCount - 1
	const lo = Math.max(first, page - span)
	const hi = Math.min(last, page + span)
	const out: (number | 'ellipsis')[] = []
	if (lo > first) {
		out.push(first)
		if (lo > first + 1) out.push('ellipsis')
	}
	for (let i = lo; i <= hi; i++) out.push(i)
	if (hi < last) {
		if (hi < last - 1) out.push('ellipsis')
		out.push(last)
	}
	return out
}
