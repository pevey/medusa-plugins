# medusa-plugin-braintree

A Braintree payment provider for Medusa v2 with first-class support for device data, addresses, and guest checkout.

[Documentation](https://pevey.com/medusa-plugin-braintree)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- A complete Medusa v2 **Payment Module provider** — authorize, capture, refund, void/cancel, saved payment methods, and webhooks.
- **Rich data straight from your storefront** — pass Braintree `deviceData` (fraud / Kount), billing and shipping addresses, a customer, and custom fields directly onto the Braintree transaction.
- **Guest-checkout friendly** — none of that requires a logged-in Medusa customer. The storefront supplies the data in the payment session, so guest carts get full fraud and AVS data.
- Works with Braintree **Hosted Fields** / Drop-in — the client token is exposed on the payment session for your client SDK.
- Supports optional **3D Secure** (`enable3DSecure`), **vaulted payment methods** (`savePaymentMethod`), and **auto-capture** (`autoCapture`).
- Per-customer **client-token caching** via Medusa's Caching module.
- **Webhook handling** for Braintree settlement events.
- **Line item data** and shipping/tax/discount amounts flow through to Braintree, giving B2B customers who use commercial cards much richer data for easier record-keeping.

## Why this provider

Braintree's fraud tooling (device data / Kount) and address verification work best when the storefront hands Braintree the **device data** and the **billing / shipping address** at the moment of payment. A payment provider that only reads those from Medusa's built-in, server-side payment context makes this awkward — especially when there is **no logged-in customer** to hang the data on.

This provider instead reads that data from the **payment session `data` that your storefront controls**. A guest cart can therefore supply device data and addresses directly, and they flow through unchanged to the Braintree `transaction.sale`. No customer account and no Medusa user context are required.

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-braintree
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

This provider adds no database tables, so there is no migration to run.

## Configuration

Braintree is registered as a **provider of Medusa's Payment Module** in `medusa-config.ts`. It uses Medusa's Caching module for client-token reuse, so declare that dependency on the payment module:

```ts
import { Modules } from '@medusajs/framework/utils'

module.exports = defineConfig({
	//... other config
	modules: [
		{
			resolve: '@medusajs/medusa/payment',
			dependencies: [Modules.CACHING],
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-braintree',
						id: 'braintree',
						options: {
							environment: process.env.BRAINTREE_ENVIRONMENT || 'sandbox',
							merchantId: process.env.BRAINTREE_MERCHANT_ID,
							publicKey: process.env.BRAINTREE_PUBLIC_KEY,
							privateKey: process.env.BRAINTREE_PRIVATE_KEY,
							enable3DSecure: process.env.BRAINTREE_ENABLE_3D_SECURE === 'true',
							savePaymentMethod: true,
							autoCapture: true
						}
					}
				]
			}
		}
		// ... other modules
	]
})
```

With `id: 'braintree'`, the provider is addressed from the storefront as **`pp_braintree_braintree`**.

### Options

| Option              | Type                                                 | Default    | Description                                                                                        |
| ------------------- | ---------------------------------------------------- | ---------- | -------------------------------------------------------------------------------------------------- |
| `environment`       | `'production' \| 'sandbox' \| 'development' \| 'qa'` | _required_ | Braintree environment. An unknown value falls back to Sandbox.                                     |
| `merchantId`        | `string`                                             | _required_ | Braintree merchant ID.                                                                             |
| `publicKey`         | `string`                                             | _required_ | Braintree public key.                                                                              |
| `privateKey`        | `string`                                             | _required_ | Braintree private key.                                                                             |
| `merchantAccountId` | `string`                                             | optional   | Braintree sub-merchant-account id — e.g. a per-currency account. Omit to use your account default. |
| `enable3DSecure`    | `boolean`                                            | `false`    | Require 3D Secure on the transaction (`options.threeDSecure.required`).                            |
| `savePaymentMethod` | `boolean`                                            | `false`    | Vault the payment method on success (`storeInVault`).                                              |
| `autoCapture`       | `boolean`                                            | `false`    | Submit for settlement immediately (capture on authorize) instead of authorize-only.                |

Enable the provider for the relevant region(s) in the Medusa admin under **Settings → Regions**.

## Storefront usage

The storefront drives the flow and passes the rich data. The shape below matches how the provider reads it — addresses use **Braintree's native field names**, not Medusa's.

**1. Create the payment session and read the client token.**

```ts
const session = await sdk.store.payment.initiatePaymentSession(cart, {
	provider_id: 'pp_braintree_braintree'
})
const clientToken = session.payment_collection.payment_sessions.find(
	s => s.provider_id === 'pp_braintree_braintree'
)?.data.client_token
```

**2. Render Braintree Hosted Fields (or Drop-in) with that token, then on submit tokenize the card and collect device data:**

```ts
const { nonce } = await hostedFields.tokenize()
const { deviceData } = await braintree.dataCollector.create({ client: braintreeClient })
```

**3. Re-create the payment session with the nonce and the rich context.** Everything under `data.context` is forwarded to Braintree:

```ts
await fetch(`/store/payment-collections/${collectionId}/payment-sessions`, {
	method: 'POST',
	headers: { 'Content-Type': 'application/json', 'x-publishable-api-key': PUBLISHABLE_KEY },
	body: JSON.stringify({
		provider_id: 'pp_braintree_braintree',
		data: {
			payment_method_nonce: nonce,
			context: {
				customer: { firstName, lastName, email, phone },
				billing: {
					firstName,
					lastName,
					streetAddress,
					extendedAddress,
					locality,
					region,
					postalCode,
					countryCodeAlpha2
				},
				shipping: {
					firstName,
					lastName,
					streetAddress,
					extendedAddress,
					locality,
					region,
					postalCode,
					countryCodeAlpha2
				},
				deviceData
			}
		}
	})
})
```

**4. Complete the cart.** The provider runs `transaction.sale` with the nonce, `deviceData`, `billing`, `shipping`, and `customer`:

```ts
await sdk.store.cart.complete(cart.id)
```

Notes:

- **Guest checkout:** none of the above requires a logged-in customer. If a Medusa customer _is_ present, its id is used to cache the client token; if not, a fresh token is generated per session.
- **`customer` requires** `firstName`, `lastName`, and `email` (plus optional `phone`).
- **`billing` / `shipping` require** `firstName`, `lastName`, `streetAddress`, `locality`, `region`, `postalCode`, and `countryCodeAlpha2` (with optional `extendedAddress`).
- **`deviceData`** is Braintree's fraud/Kount data collector output and is sent as the transaction's top-level `deviceData`.
- **Level 2/3 data (optional):** include Braintree-shaped `lineItems` plus `shippingAmount` / `taxAmount` / `shippingTaxAmount` / `discountAmount` (amount strings) in `data.context` to pass line-item and tax detail — this can lower interchange on commercial/B2B cards.
- **Webhook correlation is automatic** — the provider stamps the Medusa payment session id into Braintree's `orderId`, so settlement webhooks are matched back to the session with no storefront action or Braintree dashboard setup.

## Custom fields

Braintree custom fields let you attach your own metadata (a CRM id, a campaign code, etc.) to a transaction so it appears in Braintree reporting and webhooks. They are **not** required for Medusa webhook correlation — the provider handles that automatically via the transaction's `orderId`.

**1. Register each field in the Braintree control panel first.** Under **Settings → Processing → Custom Fields**, add a field with an **API name** (for example `crm_id`) and a display name. Braintree **rejects any transaction that includes a custom-field key you have not registered**, so this step is required before you send one.

**2. Send them from the storefront** in the payment session under `data.context.customFields`, as a flat map of `apiName` → string value (Braintree stores every custom-field value as a string):

```ts
data: {
	payment_method_nonce: nonce,
	context: {
		// ...customer, billing, shipping, deviceData...
		customFields: {
			crm_id: '12345',
			campaign: 'spring-sale'
		}
	}
}
```

Send them in the same request that attaches the nonce and addresses (step 3 of [Storefront usage](#storefront-usage)); they are forwarded to `transaction.sale`. Keys must exactly match the API names you registered, and every value must be a string.

## Webhooks

Point a Braintree webhook at Medusa's payment webhook endpoint for the provider. The provider verifies the notification with Braintree's signature and maps:

- `transaction_settled` → payment **captured / successful**
- `transaction_settlement_declined` → payment **failed**

Other notification kinds are ignored.

## Payment lifecycle

- **Authorize / capture** — with `autoCapture: true` the sale is submitted for settlement immediately; otherwise it authorizes and captures on demand. Capture is idempotent across Braintree states.
- **Refund / void** — the provider chooses automatically based on Braintree status: it **voids** transactions that are still `authorized` / `submitted_for_settlement`, and **refunds** those that are `settled` / `settling`.
- **Saved methods & account holders** — `savePaymentMethod` vaults the method; account-holder methods map to Braintree customers for logged-in customers who want reusable payment methods.
