# sveltekit-stripe

This package is a barebones SvelteKit implementation for concisely rendering Stripe Elements. It gets the job done in most cases with as little complexity as possible.

[Documentation](https://pevey.com/sveltekit-stripe)

## Features

- [Payment Element](https://stripe.com/docs/payments/payment-element)
- [Address Element](https://stripe.com/docs/elements/address-element)

## Setup

Create a SvelteKit project and install the package:

```bash
npm create svelte@latest my-app
cd my-app
npm install -D sveltekit-stripe
```

Add your Stripe public key to your environment variables:

`.env`

```bash
PUBLIC_STRIPE_KEY=pk_test_1234567890...
```

## Usage

After integrating Stripe with SvelteKit for the umpteenth time, I created this to significantly reduce the boilerplate I was writing over and over again.

A functioning Stripe integration can be achieved with very little code.

The options objects for the Svelte components are properly typed using the underlying Stripe library types to provide type hints for syntax.  If you define your options outside of the component, you can import the Stripe types from this library instead of the underlying Stripe package.

### Example: Self-Hosted Checkout Using `use:enhance`

In the example below, we assume we've already obtained a clientSecret.  In many cases, your existing ecommerce backend (such as [Vendure](https://vendure.io)) or [Medusa](https://medusajs.com)) will handle generating payment intents and/or setup intents.  Client secrets come from these intents.  See a section further down for more information about generating client secrets if you need to generate them yourself.

NOTE: For payment setup rather than checkout, replace the line

`const stripeResponse = await $stripeClient.confirmPayment({ elements: $stripeElements, redirect: 'if_required' })`

with

`const stripeResponse = await $stripeClient.confirmSetup({ elements: $stripeElements, redirect: 'if_required' })`

The address element and payment element are Stripe-hosted forms, so any content entered will not be submitted to our server with the form.  The payment and address element allow you to embed the forms on your own page, but all the processing still happens on Stripe servers.  We can use SvelteKit's built-in `enhance` action on the form to have control what happens when a user submits the form.  See the SvelteKit documentation on Form Actions for more detailed explanation of Form Actions and `use:enhance`.

The return_url below will be called after Stripe has processed the payment.  The call to the return_url will include a payload from Stripe about the status of the payment.

`+page.svelte`

```svelte
<script>
	import { Elements, PaymentElement, type StripePaymentElementOptions } from 'sveltekit-stripe'
	import { PUBLIC_STRIPE_KEY } from '$env/static/public'
	import { enhance } from '$app/forms'
	let clientSecret = 'pi_1234567890...' // from your server, see README
	let success = false

	const elementsOptions: StripePaymentElementOptions = {
		appearance: { 
			theme: 'stripe',
		},
		mode: 'payment',
		currency: 'usd',
		amount: 1000
	}
</script>

<Elements publicKey={PUBLIC_STRIPE_KEY} {elementsOptions}>
	{#snippet children({ stripe, elements })}
	<form method="POST" use:enhance={ async ({ cancel }) => {
		let stripeResponse = await elements?.submit()
		// console.log(stripeResponse)
		if (stripeResponse && !stripeResponse.error) {
			let stripeResponse = await stripe.confirmPayment({ 
				elements,
				clientSecret,
				confirmParams: { return_url: `https://example.com/order/success/${exampleOrderCode}` }
			})
			// console.log(stripeResponse)
			if (stripeResponse.error) { 
				console.log(stripeResponse.error)
				cancel()
			} 
		}
		return async ({ result }) => {
			// If we get here instead of being redirected to the url set above,
			// we know that something went wrong.
			errorMessage = stripeResponse?.error?.message
			processing = false
		}
	}}>
		<PaymentElement />
		<button type="submit">Place Your Order</button>
	</form>
	{/snippet}
</Elements>
```

### Example: Self-Hosted Checkout Using the Address Element

One way to use the Address component is to bind the container.  Once we have a binding, we can use the Stripe-provided function getValue():

`+page.svelte`
```svelte
<script>
	import { Elements, PaymentElement, AddressElement } from 'sveltekit-stripe'
	import { PUBLIC_STRIPE_KEY } from '$env/static/public'
	import { enhance } from '$app/forms'
	let clientSecret = 'pi_1234567890...' // from your server, see README
	let addressContainer
</script>

<Elements publicKey={PUBLIC_STRIPE_KEY} {elementsOptions}>
	{#snippet children({ stripe, elements })}
	<form method="POST" use:enhance={ async ({ cancel }) => {
		const {complete, value} = await addressContainer.getValue()
		if (complete) {
			// save the address somewhere
			console.log(value)
		} //else {
			// You can choose to handle the error yourself (e.g., show an error message)
			// Or you can just continue the submission and Stripe will handle the error
		//}
		
		// ...submit to Stripe as in example above
	}}>
		<AddressElement {addressElementOptions} bind:addressContainer />
		<PaymentElement />
		<button type="submit">Place Your Order</button>
	</form>
	{/snippet}
</Elements>
```

### Example: Using the `onComplete` Callback Prop with the Address Element

One downside of the above is that it only gets the value when the entire form is submitted.  This may not be suitable for some checkout flows.  The Stripe-provided change event can be surfaced via the `onChange` callback prop, but this is not usually what we want.  You still have to check each time to see if the form element is complete.  For convenience, this package provides an `onComplete` callback prop that fires with any change that constitutes a full, valid address (it receives the address value directly).

```svelte
<AddressElement onComplete={async (value) => {
		console.log(value)
		// we have an address we can do something with
		// for instance, get shipping/payment options
	}}
/>
```

## Obtaining a Client Secret

Each time a user begins checkout, a payment intent needs to be generated. The payment intent contains a client secret that must be passed to the client.  A valid client secret must be passed to the Address and Payment components, or they will not render.

In many use cases, another system, such as an ecommerce backend, already has a method of generating and providing client secrets for checkout.  Please see the relevant documentation for your backend.

### Passing from Server to Client in a Load Function 

One way to pass a client secret to the client in SvelteKit is via the load function.  The client secret can be passed to the client as a prop, which is then passed to the Address and Payment components.

`+page.server.js`

```js
export const load = async () => {
	const clientSecret = await generateClientSecret() // example function 
	return {
		clientSecret
	}
}
```

Please note that `generateClientSecret()` is not a real function.  It is a placeholder for however you generate a client secret using your ecommerce backend.

`+page.svelte`

```svelte
<script>
	...
	export let data
	let clientSecret = data?.clientSecret
	...
</script>
```

### Passing from Server to Client in an Endpoint

Another way to obtain a client secret is to use an endpoint.  A simplified example:

`+server.js`

```js
import { json } from '@sveltejs/kit'

export async function POST({ request }) {
	const data = await request.json()
	// some sort of validation on data
	const clientSecret = await generateClientSecret() // example function 
	return json({clientSecret})
}
```

NOTE: In practice, you would want to use recaptcha or turnstile on this endpoint.  See example in a section below.

You can load the clientSecret from the server endpoint when the page loads like this:

`+page.svelte`
```js
{#if !clientSecret}
	let clientSecret = await fetch('/api/stripe', { 
		method: 'POST',
		headers: {'Content-Type': 'application/json'},
		body: JSON.stringify({some:data}) 
	}).then(res => res.json())
{:else}
// rest of page
```

Or, you can take advantage of the relatively new ability in Stripe to produce Payment element without yet having a clientSecret, and then generate the client secret when the payment is submitted.  This approach of creating the intent/clientSecret at the last moment is useful if the final price might change due to shipping ot other charges, and avoids the need to use the stripe client to manually update the payment intent after it was initially created.

`+page.svelte`
```svelte
<script>
	import { Elements, PaymentElement, AddressElement } from 'sveltekit-stripe'
	import { PUBLIC_STRIPE_KEY } from '$env/static/public'
	import { enhance } from '$app/forms'
	let clientSecret = 'pi_1234567890...' // from your server, see README
	let addressContainer
</script>

<Elements publicKey={PUBLIC_STRIPE_KEY} {elementsOptions}>
	{#snippet children({ stripe, elements })}
	<form method="POST" use:enhance={ async ({ cancel }) => {
		let stripeResponse = await elements?.submit()
		// get the client secret here before final submission of payment
		const { clientSecret } = await fetch('/checkout/turnstile', { 
			method: 'POST', 
			body: JSON.stringify({ token })
		}).then(res => res.json()).catch(e => console.log(e))

		if (stripeResponse && !stripeResponse.error) {
			let stripeResponse = await stripe.confirmPayment({ 
				elements,
				clientSecret,
				confirmParams: { return_url: `https://example.com/order/success/${exampleOrderCode}` }
			})
			if (stripeResponse.error) { 
				console.log(stripeResponse.error)
				cancel()
			} 
		}
		return async ({ result }) => {
			// If we get here instead of being redirected to the url set above,
			// we know that something went wrong.
			errorMessage = stripeResponse?.error?.message
			processing = false
		}
	}}>
		<AddressElement onComplete={ async (value) => {
			console.log(value.firstName, value.lastName, value.address)
		}}/>
		<PaymentElement />
		<button type="submit">Place Your Order</button>
	</form>
	{/snippet}
</Elements>
```

### A Note About Security

Client secrets include payment intents.  Exposing a way that a bot could generate payment intents very rapidly will expose you to carding attacks.  There are number of ways to mitigate the risk of automated carding attacks.  One way is client-side tools like Turnstile or reCAPTCHA.  A full discussion is outside the scope of this readme, but it's important to mention.  Consider using Turnstile or reCAPTCHA and other tools to rate limit the generation of payment intents.

If passing the client secret via a load function, consider adding a form action to the checkout page and make your checkout button post the token from Turnstile.  The checkout page form action will run before the checkout page load function.

If obtaining the client secret via an endpoint, you can obtain a client-side token before calling the endpoint and validate the token before returning a payment intent. A Turnstile Example:

`+server.js`

```js
import { validateToken } from 'sveltekit-turnstile'
import { SECRET_TURNSTILE_KEY } from '$env/static/private'
import { error, json } from '@sveltejs/kit'

export async function POST({ request }) {
	const data = await request.json()
	if (!await validateToken(data.token, SECRET_TURNSTILE_KEY)) throw error(400, { message: 'Bot risk' })
	// some sort of validation on data
	const clientSecret = await generateClientSecret() // example function 
	return json(clientSecret)
}
```

`+page.svelte`

```svelte
<script>
	...
	import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public'
	import { Turnstile } from 'sveltekit-turnstile'

	let token: string
	...
</script>
...
{#if !token}
	<Turnstile siteKey={PUBLIC_TURNSTILE_SITE_KEY} on:turnstile-callback={ async (e) => { 
		token = e.detail.token
	}} />
{:else}
...
```

## Generating a Client Secret

If you need to generate a client secret yourself, you will first need to add your secret Stripe key to your .env file:

`.env`

```bash
SECRET_STRIPE_KEY="sk_1234567890..."
```

You must also add the Stripe SDK to your project:

```bash
npm install -D stripe
```

Then, you can generate a payment intent in your load function and export the client secret:

`+page.server.js`

```js
import { Stripe } from 'stripe'
import { SECRET_STRIPE_KEY } from '$env/static/private'

export const load = async () => {
	const stripe = new Stripe(SECRET_STRIPE_KEY)

	const options = {
		price: 1000, // price in smallest units (eg pennies), REQUIRED
		currency: 'USD', // currency code, REQUIRED
		//customer: locals.user.stripeCustomerId, required for setup intent
		//setup_future_usage: 'on_session', 
		//automatic_payment_methods: { enabled: true }
	}

	const paymentIntent = await stripe.paymentIntents.create(options)

	return { 
		clientSecret: paymentIntent.client_secret
	}
}
```

While the above example works fine, you will probably notice that instantiating a new Stripe object on every load is not ideal.  We could instead create a singleton Stripe object in your app and export it.

`lib/server/stripe.js`

```js
import { Stripe } from 'stripe'
import { SECRET_STRIPE_KEY } from '$env/static/private'
export default new Stripe(SECRET_STRIPE_KEY)
```

`+page.server.js`

```js
import stripe from '$lib/server/stripe'

export const load = async () => {
	const options = {
		price: 1000, 
		currency: 'USD'
	}

	const paymentIntent = await stripe.paymentIntents.create(options)

	return { 
		clientSecret: paymentIntent.client_secret
	}
}
```

## Passing Options

The Payment and Address components support all options available in the Stripe SDK.

For details about options available, see the Stripe Documentation:

- Payment Element [(docs)](https://stripe.com/docs/js/element/payment_element)
- Address Element [(docs)](https://stripe.com/docs/js/element/address_element)

### Example: Passing Options

`+page.svelte`

```svelte
<script>
	...
	let addressElementOptions = {
		autocomplete: 'automatic',
		allowedCountries: ['US', 'CA'],
		blockPoBox: false,
		display: { name: 'split' }
		contacts: [{
			name: 'Jenny Rosen',
			address: {
				line1: '185 Berry St.',
				city: 'San Francisco',
				state: 'CA',
				postal_code: '94941',
				country: 'US',
			}
		}]
	}
	...
</script>

...
<AddressElement {addressElementOptions} />
...
```

### Example: Passing Options from a Separate File

If preferred, your options can be set in a separate file and imported.

`addressElementOptions.ts`

```ts
import type { StripeAddressElementOptions } from 'sveltekit-stripe'
export default addressElementOptions: StripeAddressElementOptions = {
	// options
}
```

`+page.svelte`

```svelte
import addressElementOptions from './addressElementOptions'
...
```

## Customizing the Elements

The Payment and Address components support the [Appearance API](https://stripe.com/docs/elements/appearance-api).
