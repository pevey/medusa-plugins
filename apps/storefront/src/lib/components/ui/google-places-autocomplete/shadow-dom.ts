export const GPAC_SHADOW_CSS = `
	/* our own focus style (host :focus-within) replaces Google's blue ring */
	.focus-ring { display: none !important; }

	/* fullscreen exit arrow — always stripped (mobile artifact) */
	.back-button { display: none !important; }

	/* per-instance chrome opt-out via host data attributes */
	:host([data-gpac-search='false']) .autocomplete-icon { display: none !important; }
	:host([data-gpac-close='false']) .clear-button { display: none !important; }
	:host([data-gpac-location='false']) [part~='prediction-item-icon'] { display: none !important; }

	/* collapse Google's padding/border; the host provides border + radius */
	.widget-container,
	.input-container {
		padding: 0 !important;
		margin: 0 !important;
		border: none !important;
		background: transparent !important;
	}

	/* pin the ROW height so showing icons can't stretch it — Google's icon controls carry their
	   own padding/min-height and would otherwise become the tallest flex child. The row tracks
	   --gpac-input-height just like the input, so height stays identical with or without icons. */
	.input-container {
		height: var(--gpac-input-height, 2.25rem) !important;
		min-height: var(--gpac-input-height, 2.25rem) !important;
		align-items: center !important;
	}

	/* tame Google's icon controls (magnifier + clear-x): drop the intrinsic padding/min-height
	   that inflated the row; size the glyph via --gpac-icon-size, space it via --gpac-icon-gap.
	   The default <svg>s are slotted default content living in the shadow, so this reaches them. */
	.autocomplete-icon,
	.clear-button {
		width: auto !important;       /* hug the glyph — Google gives these a wide fixed box */
		min-width: 0 !important;
		flex: 0 0 auto !important;
		padding: 0 !important;
		min-height: 0 !important;
		height: auto !important;
		border: none !important;
		background: transparent !important;
		margin-inline: var(--gpac-icon-gap, 0.5rem) !important;
	}
	/* Drop the input's OWN edge padding on whichever side holds an icon, so --gpac-icon-gap is the
	   single source of that side's spacing (otherwise input padding + icon margin STACK into a gap
	   that --gpac-icon-gap can't shrink). Keyed off the per-instance host attributes. */
	:host([data-gpac-search='true']) input[part='input'] { padding-inline-start: 0 !important; }
	:host([data-gpac-close='true']) input[part='input'] { padding-inline-end: 0 !important; }
	.autocomplete-icon svg,
	.clear-button svg {
		width: var(--gpac-icon-size, 1.125rem) !important;
		height: var(--gpac-icon-size, 1.125rem) !important;
		margin: 0 !important;
	}

	/* input sized to a shadcn <input>; each value overridable via --gpac-* */
	input[part='input'] {
		box-sizing: border-box !important;
		width: 100% !important;
		height: var(--gpac-input-height, 2.25rem) !important;
		padding: var(--gpac-input-padding, 0 0.75rem) !important;
		font-size: var(--gpac-input-font-size, 0.875rem) !important;
		line-height: var(--gpac-input-line-height, 1.25rem) !important;
		color: var(--foreground) !important;
		background: transparent !important;
		border: none !important;
		outline: none !important;
		box-shadow: none !important;
	}

	/* dropdown → shadcn popover (colors only; Google's default row spacing kept) */
	.dropdown,
	[part~='prediction-list'] {
		background: var(--popover) !important;
		color: var(--popover-foreground) !important;
		border: 1px solid var(--border) !important;
		border-radius: var(--radius) !important;
		box-shadow: 0 4px 12px rgb(0 0 0 / 0.10) !important;
		margin-top: var(--gpac-prediction-list-gap, 0.25rem) !important;
	}
	[part~='prediction-item'] {
		border-radius: calc(var(--radius) - 2px) !important;
		color: var(--popover-foreground) !important;
	}
	[part~='prediction-item']:hover,
	[part~='prediction-item-selected'] {
		background: var(--accent) !important;
		color: var(--accent-foreground) !important;
	}
	[part~='prediction-item-main-text'] { color: var(--popover-foreground) !important; }
	[part~='prediction-item-secondary-text'] { color: var(--muted-foreground) !important; }

	/* keep "Powered by Google" (ToS) but soften it */
	.attributions { opacity: 0.55 !important; }
`

// Force gmp-place-autocomplete's (otherwise closed) shadow open and inject GPAC_SHADOW_CSS at
// creation. Scoped to that one element type; all other attachShadow calls pass through. Persistent
// (never restored) so late-mounting instances (e.g. a billing field) are handled too. Idempotent.
export function installGpacShadowStyling(): void {
	if (typeof window === 'undefined') return
	const w = window as unknown as { __gpacShadowPatched?: boolean }
	if (w.__gpacShadowPatched) return
	const original = Element.prototype.attachShadow
	Element.prototype.attachShadow = function (this: Element, init: ShadowRootInit) {
		if (this.localName === 'gmp-place-autocomplete') {
			const shadow = original.call(this, { ...init, mode: 'open' })
			const style = document.createElement('style')
			style.textContent = GPAC_SHADOW_CSS
			shadow.appendChild(style)
			return shadow
		}
		return original.call(this, init)
	}
	w.__gpacShadowPatched = true
}
