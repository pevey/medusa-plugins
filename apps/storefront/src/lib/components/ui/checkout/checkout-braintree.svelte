<script lang="ts">
	import type { RemoteForm } from '@sveltejs/kit'
	import type { StoreOrder } from '@medusajs/types'
	import { braintreeCheckoutForm } from 'sveltekit-medusa-sdk'
	import Root from './checkout.svelte'
	import Body from './checkout-braintree-body.svelte'

	interface Props {
		form?: RemoteForm<any, any>
		googlePlacesApiKey?: string
		restrictToCurrentRegion?: boolean
		navigate?: (url: string) => void | Promise<void>
		redirectTo?: string | ((order: StoreOrder) => string)
		oncomplete?: (order: StoreOrder) => void
		onerror?: (err: unknown) => void
		class?: string
	}
	let {
		form = braintreeCheckoutForm as unknown as RemoteForm<any, any>,
		googlePlacesApiKey,
		restrictToCurrentRegion,
		...rest
	}: Props = $props()
</script>

<form {...form}>
	<Root {form} {...rest}>
		<Body {form} {googlePlacesApiKey} {restrictToCurrentRegion} />
	</Root>
</form>
