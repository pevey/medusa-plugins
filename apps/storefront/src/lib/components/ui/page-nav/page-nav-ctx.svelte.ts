import { getContext, setContext } from 'svelte'

// Set by PageNav.Root from its props so the parts don't each need page/pageCount/pageParam.
export type PageNavContext = {
	readonly page: number
	readonly pageCount: number
	readonly pageParam: string
}

const KEY = Symbol('page-nav')

export function setPageNavContext(ctx: PageNavContext) {
	setContext(KEY, ctx)
}

export function getPageNavContext(): PageNavContext {
	const ctx = getContext<PageNavContext>(KEY)
	if (!ctx) throw new Error('PageNav.* must be used within <PageNav.Root>')
	return ctx
}
