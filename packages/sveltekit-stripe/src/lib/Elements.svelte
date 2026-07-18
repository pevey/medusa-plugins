<script lang="ts">
	import type { Snippet } from 'svelte'
	import type { Stripe, StripeElements, StripeElementsOptions } from '@stripe/stripe-js'
	import { loadStripe } from '@stripe/stripe-js'
	import { onMount } from 'svelte'
	import { dev, browser } from '$app/env'
	import { stripeClient, stripeElements } from './stores.js'

	interface Props {
		publicKey: string
		elementsOptions?: StripeElementsOptions
		children?: Snippet<[{ stripe: Stripe | null; elements: StripeElements | undefined }]>
	}

	let { publicKey, elementsOptions = undefined, children }: Props = $props()

	let mounted = $state(false)

	onMount(async () => {
		if (!publicKey) {
			if (dev) console.error('No public key provided')
			return
		}

		if (browser) {
			try {
				const client: Stripe | null = await loadStripe(publicKey)
				// Stripe types `elements()` as two overloads (mode vs clientSecret);
				// our public `elementsOptions` prop is the union of both, which TS
				// can't match to a single overload though the call is valid at runtime.
				const elements = client?.elements(elementsOptions as any)
				stripeClient.set(client)
				stripeElements.set(elements)
			} catch (e) {
				if (dev) console.error(e)
			}
			mounted = true
		}
	})
</script>

{#if mounted}
	{@render children?.({ stripe: $stripeClient, elements: $stripeElements })}
{/if}
