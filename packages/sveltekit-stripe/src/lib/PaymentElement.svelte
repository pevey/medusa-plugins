<script lang="ts">
	import type { StripePaymentElement, StripePaymentElementOptions } from '@stripe/stripe-js'
	import type { Attachment } from 'svelte/attachments'
	import { onMount } from 'svelte'
	import { dev } from '$app/env'
	import { stripeElements } from './stores.js'

	interface Props {
		// see all options at https://stripe.com/docs/js/elements_object/create_payment_element
		paymentElementOptions?: StripePaymentElementOptions
		paymentContainer?: StripePaymentElement
	}

	let {
		paymentElementOptions = { layout: 'tabs' },
		paymentContainer = $bindable()
	}: Props = $props()

	let mounted = $state(false)
	let elements = $derived($stripeElements)

	onMount(() => {
		mounted = true
		return () => {
			mounted = false
		}
	})

	const paymentElement: Attachment<HTMLElement> = (node) => {
		try {
			paymentContainer = $stripeElements?.create('payment', paymentElementOptions)
			paymentContainer?.mount(node)
		} catch (e) {
			if (dev) console.error(e)
		}
		return () => {
			if (paymentContainer) paymentContainer.destroy()
			stripeElements.set(undefined)
		}
	}
</script>

{#if mounted && elements}
	<div {@attach paymentElement}></div>
{/if}
