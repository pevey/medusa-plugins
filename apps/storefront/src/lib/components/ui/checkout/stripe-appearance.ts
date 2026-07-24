import type { Appearance } from '@stripe/stripe-js'

/**
 * Build a Stripe Elements `appearance` from the app's shadcn design tokens.
 *
 * Stripe Elements render inside an iframe and cannot resolve the parent document's CSS custom
 * properties, so we pass CONCRETE values read off the document root. Crucially, Stripe's appearance
 * API only accepts HEX / rgb() / hsl() colors — NOT Tailwind v4's `oklch(...)` — so color tokens are
 * converted to rgb by round-tripping them through a hidden probe element (the browser does the
 * conversion). Non-color tokens (radius, font) are passed through raw. The resolver is injectable so
 * the mapping is unit-testable without a DOM.
 */

/** Resolve a CSS custom property. `asColor` converts the value to an rgb() string for Stripe. */
export type CssVarResolver = (name: string, asColor?: boolean) => string

/** Default resolver: read computed `:root` custom properties; convert colors to rgb via a probe. */
export function domCssVarResolver(): CssVarResolver {
	const rootStyles = getComputedStyle(document.documentElement)
	const probe = document.createElement('span')
	probe.style.position = 'absolute'
	probe.style.opacity = '0'
	probe.style.pointerEvents = 'none'
	document.body.appendChild(probe)
	return (name, asColor = false) => {
		const raw = rootStyles.getPropertyValue(name).trim()
		if (!raw || !asColor) return raw
		// Let the browser normalize any color (oklch/hsl/hex/var) to rgb — Stripe accepts rgb.
		probe.style.color = ''
		probe.style.color = raw
		return getComputedStyle(probe).color || ''
	}
}

export interface StripeAppearanceOptions {
	/** Override the resolver (tests inject a fake; browser defaults to the DOM). */
	resolve?: CssVarResolver
	/** Stripe base theme to layer tokens over. */
	theme?: Appearance['theme']
}

export function buildStripeAppearance(opts: StripeAppearanceOptions = {}): Appearance {
	const resolve = opts.resolve ?? domCssVarResolver()
	const color = (name: string): string | undefined => resolve(name, true) || undefined
	const raw = (name: string): string | undefined => resolve(name, false) || undefined

	const variables = pruneUndefined({
		colorPrimary: color('--primary'),
		colorBackground: color('--background'),
		colorText: color('--foreground'),
		colorTextSecondary: color('--muted-foreground'),
		colorDanger: color('--destructive'),
		borderRadius: raw('--radius'),
		fontFamily: raw('--font-sans')
	})

	// Rule values must be concrete strings (no `undefined`), so only add a property when it resolves.
	const border = color('--border')
	const ring = color('--ring')
	const inputRule: Record<string, string> = { boxShadow: 'none' }
	if (border) inputRule.border = `1px solid ${border}`
	const focusRule: Record<string, string> = {}
	if (ring) {
		focusRule.border = `1px solid ${ring}`
		focusRule.boxShadow = `0 0 0 3px ${ring}`
	}

	return {
		theme: opts.theme ?? 'stripe',
		variables,
		rules: { '.Input': inputRule, '.Input:focus': focusRule }
	}
}

function pruneUndefined<T extends Record<string, unknown>>(obj: T): T {
	for (const k of Object.keys(obj)) if (obj[k] === undefined) delete obj[k]
	return obj
}
