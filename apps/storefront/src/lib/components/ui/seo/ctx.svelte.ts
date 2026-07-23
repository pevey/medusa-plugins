import { getContext, setContext } from 'svelte'
import type { SiteMeta } from './types.js'

export type SiteMetaContext = { readonly site: SiteMeta }
const KEY = Symbol('site-meta')

export function setSiteMetaContext(ctx: SiteMetaContext) {
	setContext(KEY, ctx)
}
export function getSiteMetaContext(): SiteMetaContext {
	const ctx = getContext<SiteMetaContext>(KEY)
	if (!ctx) throw new Error('Must be used within <MetaProvider>')
	return ctx
}
export function getSiteMetaContextOptional(): SiteMetaContext | null {
	return getContext<SiteMetaContext>(KEY) ?? null
}
