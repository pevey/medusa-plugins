import type { Appearance } from '@stripe/stripe-js'

/**
 * Build a Stripe Elements `appearance` from the app's shadcn design tokens.
 *
 * Stripe Elements render inside an iframe and cannot resolve the parent document's CSS custom
 * properties, so we pass CONCRETE values read off the document root. Crucially, Stripe's appearance
 * API only accepts HEX / rgb() / hsl() colors — NOT Tailwind v4's `oklch(...)` — so color tokens are
 * rasterized to rgb through a 1px `<canvas>` (see `domCssVarResolver`). We can NOT use
 * `getComputedStyle(probe).color`: modern browsers serialize computed colors back as `oklab(...)` /
 * `oklch(...)`, which Stripe (and Braintree) reject. Non-color tokens (radius, font) pass through raw.
 * The resolver is injectable so the mapping is unit-testable without a DOM.
 */

/** Resolve a CSS custom property. `asColor` converts the value to an rgb() string for Stripe. */
export type CssVarResolver = (name: string, asColor?: boolean) => string

/** Default resolver: read computed `:root` custom properties; rasterize colors to rgb via a canvas. */
export function domCssVarResolver(): CssVarResolver {
	const rootStyles = getComputedStyle(document.documentElement)
	// A 1px canvas rasterizes ANY CSS color (oklch/oklab/hsl/hex) to concrete sRGB bytes. We do NOT use
	// `getComputedStyle(probe).color` — modern browsers serialize computed colors back as
	// `oklab(...)`/`oklch(...)`, which Stripe/Braintree reject; the canvas always yields rgb.
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = 1
	const ctx = canvas.getContext('2d')
	return (name, asColor = false) => {
		const raw = rootStyles.getPropertyValue(name).trim()
		if (!raw || !asColor || !ctx) return raw
		ctx.clearRect(0, 0, 1, 1)
		ctx.fillStyle = '#000' // fallback kept if `raw` is an unparseable color (setter ignores it)
		ctx.fillStyle = raw
		ctx.fillRect(0, 0, 1, 1)
		const [r, g, b, a] = ctx.getImageData(0, 0, 1, 1).data
		return a === 255
			? `rgb(${r}, ${g}, ${b})`
			: `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(3)})`
	}
}

export interface StripeAppearanceOptions {
	/** Override the resolver (tests inject a fake; browser defaults to the DOM). */
	resolve?: CssVarResolver
	/** Stripe base theme to layer tokens over. */
	theme?: Appearance['theme']
	/**
	 * Opaque input-surface color for `colorBackground` — pass `resolveInputSurface()` so Stripe's fields
	 * match the shadcn inputs' lift. Falls back to `--background` when omitted (e.g. unit tests, no DOM).
	 */
	inputSurface?: string
}

export function buildStripeAppearance(opts: StripeAppearanceOptions = {}): Appearance {
	const resolve = opts.resolve ?? domCssVarResolver()
	const color = (name: string): string | undefined => resolve(name, true) || undefined
	const raw = (name: string): string | undefined => resolve(name, false) || undefined

	const variables = pruneUndefined({
		colorPrimary: color('--primary'),
		colorBackground: opts.inputSurface || color('--background'),
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

/**
 * The OPAQUE color a shadcn `<input>` visually shows on this page — its translucent `bg-input/30`
 * lift composited over `--background`. Iframe / shadow-DOM surfaces (Braintree hosted fields, Stripe
 * Elements) can't paint a translucent fill (it wouldn't cover the browser's default white form
 * background), so they need this opaque equivalent to match the plain shadcn inputs beside them.
 * Reads a hidden probe carrying the REAL input classes (so it tracks whatever lift the theme defines),
 * then composites lift-over-background on a 1px canvas — which handles oklch/oklab AND the alpha blend.
 */
export function resolveInputSurface(): string {
	const bgRaw = getComputedStyle(document.documentElement).getPropertyValue('--background').trim()
	const probe = document.createElement('div')
	probe.className = 'bg-transparent dark:bg-input/30'
	probe.style.cssText = 'position:absolute;opacity:0;pointer-events:none'
	document.body.appendChild(probe)
	const liftRaw = getComputedStyle(probe).backgroundColor
	probe.remove()
	const canvas = document.createElement('canvas')
	canvas.width = canvas.height = 1
	const ctx = canvas.getContext('2d')
	if (!ctx) return bgRaw || 'rgb(255, 255, 255)'
	if (bgRaw) {
		ctx.fillStyle = bgRaw
		ctx.fillRect(0, 0, 1, 1)
	}
	if (liftRaw) {
		ctx.fillStyle = liftRaw // painted OVER the background → canvas alpha-composites
		ctx.fillRect(0, 0, 1, 1)
	}
	const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data
	return `rgb(${r}, ${g}, ${b})`
}
