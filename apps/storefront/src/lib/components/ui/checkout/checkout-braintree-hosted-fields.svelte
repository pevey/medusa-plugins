<script lang="ts">
	// Braintree hosted-fields PROVIDER (mirrors checkout-stripe-elements): initiate the Medusa Braintree
	// session to obtain the client token, then mount <HostedFields> around the payment children, theming
	// the field IFRAMES via the `styles` pass-through. The inner card component tokenizes via context.
	import { onMount, type Snippet } from 'svelte'
	import { HostedFields } from 'sveltekit-braintree'
	import { initiateBraintreePaymentSession } from 'sveltekit-medusa-sdk'
	import { getBraintreeClientToken } from './checkout-logic.js'
	import { domCssVarResolver, resolveInputSurface } from './stripe-appearance.js'

	const PROVIDER = 'pp_braintree_braintree'

	let { children }: { children: Snippet } = $props()

	let authorization = $state<string | null>(null)
	let styles = $state<Record<string, Record<string, string>> | undefined>(undefined)

	// Braintree's `styles` only styles TEXT and can't read the parent doc's CSS vars, so resolve CONCRETE
	// rgb values; fill the otherwise-white iframe input via the one whitelisted painting property — an
	// opaque inset box-shadow (same approach as the Stripe appearance + the old inline component).
	function buildFieldStyles(): Record<string, Record<string, string>> {
		const resolve = domCssVarResolver()
		const fg = resolve('--foreground', true)
		const surface = resolveInputSurface()
		return {
			input: {
				'box-shadow': `inset 0 0 0 1000px ${surface}`,
				'-webkit-box-shadow': `inset 0 0 0 1000px ${surface}`,
				'font-size': '14px',
				'font-family': resolve('--font-sans', false) || 'inherit',
				color: fg,
				'-webkit-text-fill-color': fg
			},
			'::placeholder': { color: resolve('--muted-foreground', true) },
			'input.invalid': { color: resolve('--destructive', true) }
		}
	}

	onMount(async () => {
		styles = buildFieldStyles()
		const session = await initiateBraintreePaymentSession({ provider_id: PROVIDER })
		authorization = getBraintreeClientToken(session, PROVIDER) ?? null
		if (import.meta.env.DEV && !authorization) {
			console.warn(`[CheckoutBraintree] no client_token from "${PROVIDER}" — is there an active cart whose region has Braintree enabled?`, session)
		}
	})
</script>

{#if authorization}
	<HostedFields {authorization} {styles}>
		{@render children()}
	</HostedFields>
{/if}
