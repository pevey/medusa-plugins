# sveltekit-medusa-sdk

A SvelteKit client for communicating with a [Medusa](https://medusajs.com) v2 backend built on top of the Medusa JS SDK. It is designed to access the Medusa backend **only from the storefront server**. It is not designed for having the client browser make network calls to the Medusa backend directly.

This package is the successor to [sveltekit-medusa-client](https://www.npmjs.com/package/sveltekit-medusa-client), a SvelteKit library for communicating with a v1 Medusa backend.

## What changed from `sveltekit-medusa-client`

The SvelteKit client for Medusa v1 exported a **class** (`new MedusaClient(url)`) that you instantiated somewhere in your app and then imported into each load function, form action, or endpoint that needed Medusa access. This successor client for Medusa v2 is built around SvelteKit's **remote functions** feature. You import ready-made `query`/`command`/`form` functions (e.g. `getProducts`, `addToCart`, `login`) and call them directly from components. Under the hood, they use a single shared `@medusajs/js-sdk` instance, configured once via a hook. Credentials and region are pulled from the request context and injected on every call. So you get the benefit of avoiding per-request client construction while still getting request-scoped pass-through of credentials from the browser to the Medusa backend.

## Warning

Remote functions are still classified as **experimental** by the SvelteKit team. Breaking changes in the remote functions API may be introduced between SvelteKit releases without a major version bump. Pin your SvelteKit version and review the changelog when upgrading until the feature stabilizes.

## Requirements

- SvelteKit `>= 2.22` and Svelte `>= 5.36` (versions with remote functions).
- Experimental flags enabled in your app's `svelte.config.js`:

```js
// svelte.config.js
const config = {
	compilerOptions: {
		experimental: {
			async: true
		}
	},
	kit: {
		experimental: {
			remoteFunctions: true
		}
	}
}
export default config
```

## Installation

```bash
yarn add -D sveltekit-medusa-sdk
```

## Configuration

Wire the handle once in `src/hooks.server.ts` (the only place your private env is read):

```ts
// src/hooks.server.ts
import { createMedusaHandle } from 'sveltekit-medusa-sdk'
import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY } from '$env/static/private'

export const handle = createMedusaHandle({
	// required:
	baseUrl: MEDUSA_BACKEND_URL,
	publishableKey: MEDUSA_PUBLISHABLE_KEY,
	// optional:
	defaultRegionId: 'reg_...',
	defaultCountryCode: 'us',
	globalHeaders: {
		// e.g. Cloudflare Access, if your backend is firewalled behind it
		// 'CF-Access-Client-Id': CLOUDFLARE_ACCESS_ID,
		// 'CF-Access-Client-Secret': CLOUDFLARE_ACCESS_SECRET
	},
	cookies: {
		// the names you want for the cookies that will be set in the client browser
		session: 'sid',
		region: 'region',
		country: 'country',
		cart: 'cartid'
	},
	backendSessionCookie: 'connect.sid', // the name of the session cookie coming from your Medusa backend
	transferCartOnLogin: true
})
```

Augment `App.Locals` so the per-request context is typed (the handle assigns
`event.locals.medusa`, so you can use the configured client in your own load functions and
endpoints):

```ts
// src/app.d.ts
import type { MedusaContext } from 'sveltekit-medusa-sdk'
declare global {
	namespace App {
		interface Locals {
			medusa: MedusaContext
		}
	}
}
export {}
```

### Config options

| Option                 | Default       | Description                                                    |
| ---------------------- | ------------- | -------------------------------------------------------------- |
| `baseUrl`              | —             | Medusa backend URL (required)                                  |
| `publishableKey`       | —             | Medusa publishable API key (required)                          |
| `globalHeaders`        | `{}`          | Headers sent on every backend request (e.g. Cloudflare Access) |
| `defaultRegionId`      | —             | Fallback region when no `region` cookie is set                 |
| `defaultCountryCode`   | —             | Fallback country when no `country` cookie is set               |
| `backendSessionCookie` | `connect.sid` | The session cookie name Medusa issues                          |
| `cookies.session`      | `sid`         | The session cookie name on your storefront (the rename)        |
| `cookies.region`       | `region`      | Region cookie name                                             |
| `cookies.country`      | `country`     | Country cookie name                                            |
| `cookies.cart`         | `cartid`      | Cart id cookie name                                            |
| `transferCartOnLogin`  | `true`        | Transfer the anonymous cart to the customer on login           |
| `debug`                | `false`       | Enable SDK debug logging                                       |

### The `sid` cookie rename

On login, this library establishes a Medusa backend session and re-issues it to your storefront under a **neutral cookie name** (default `sid`) instead of Medusa's`connect.sid`. Two reasons: it makes it less obvious your backend is Medusa (a small hurdle against broad vulnerability scanning), and a distinct name tells you at a glance, while
debugging, that _your storefront_ set the cookie. Both names are configurable.

## Usage

```svelte
<script lang="ts">
  import { getProducts, addToCart } from 'sveltekit-medusa-sdk'
</script>

<ul>
  {#each await getProducts() as product}
    <li>{product.title}</li>
  {/each}
</ul>
```

## Available Functions

All functions are exported from the package root. Each `*.remote.ts` module is also available as a subpath import (e.g. `sveltekit-medusa-sdk/cart`, `sveltekit-medusa-sdk/auth`). Schemas are exported from `sveltekit-medusa-sdk/schemas`.

Two conventions to know:

- **Catalog reads ship two variants** — a **prerender** default (takes explicit `region_id`/`country_code` args) and a `*Query` twin (reads region/country from the request's cookies, can be updated dynamically).
- **Auth functions return a structured `{ ok: boolean, code?: string }`** so you can map stable codes (`invalid_credentials`, `email_exists`, `rate_limited`, `unsupported`, `unknown`) to your own copy/i18n.

### regions

- `getRegions` — prerender

### products

- `getProducts` — prerender
- `getProduct` — prerender (by `id` or `slug`)
- `getProductsQuery` — query
- `getProductQuery` — query (by `id` or `slug`)

### categories

- `getProductCategories` — prerender
- `getProductCategory` — prerender (by `id` or `slug`)
- `getProductCategoriesQuery` — query
- `getProductCategoryQuery` — query (by `id` or `slug`)

### collections

- `getCollections` — prerender
- `getCollection` — prerender (by `id` or `slug`)
- `getCollectionsQuery` — query
- `getCollectionQuery` — query (by `id` or `slug`)

### cart

- `getCart` — query
- `getCartById` — query
- `createCart` — command
- `addToCart` — command
- `removeFromCart` — command
- `updateCartItem` — command
- `updateCart` — command
- `selectShippingOption` — command
- `getShippingOptions` — query
- `completeCart` — command

### promotions

- `addPromotion` — command
- `removePromotion` — command

### payment

- `listPaymentProviders` — query
- `initiatePaymentSession` — command (generic, any provider)

### braintree

- `braintreeCheckoutForm` — form
- `initiateBraintreePaymentSession` — command
- `braintreeCheckoutSchema` — valibot schema (from `sveltekit-medusa-sdk/schemas`)

### orders

- `getOrders` — query
- `getOrderById` — query

### auth

- `login` — form (returns `{ ok, code }`)
- `register` — form (returns `{ ok, code }`)
- `requestResetPassword` — form (returns `{ ok, code }`)
- `resetPassword` — form (returns `{ ok, code }`)
- `logout` — command (returns `{ ok, code }`)

### customer

- `getCustomer` — query
- `updateCustomer` — command

### address

- `getAddresses` — query
- `saveAddress` — form (create or update by `id`)
- `deleteAddress` — command

### search

- `search` — query (requires medusa-plugin-search on the backend)

### forms

- `submitForm` — command (requires medusa-plugin-forms on the backend)

## Extending the client

Because the library exposes its per-request context, you can add your own remote functions in your app that reuse the same configured Medusa instance. This is useful if you have custom routes added by your own Medusa plugins or if you want to customize any of the functions included in the library. Call `getMedusaContext()` within a custom remote function get an object with the relevant context (`{ client, region_id, country_code, headers() }`) for the current request. Passing `headers()` sends the logged-in customer's session.

```ts
// src/lib/orders.remote.ts
import { query } from '$app/server'
import { getMedusaContext } from 'sveltekit-medusa-sdk'

// Fetches the signed-in customer's orders — requires credentials, which
// getMedusaContext().headers() supplies from the request's session cookie.
export const getMyOrders = query(async () => {
	const ctx = getMedusaContext()
	const { orders } = await ctx.client.store.order.list(
		{ limit: 20 },
		ctx.headers() // <-- replays the session; without it the call is anonymous
	)
	return orders
})
```

```svelte
<script lang="ts">
  import { getMyOrders } from '$lib/orders.remote'
</script>

<ul>
  {#each await getMyOrders() as order}
    <li>#{order.display_id} — {order.total}</li>
  {/each}
</ul>
```

`getMedusaContext()` may only be called inside a remote function (it reads the current request). Only `form` and `command` functions can **write** cookies; `query` and `prerender` cannot.

## Rendering data server-side (SSR)

With `experimental.async` you can `await` a query directly in markup (`{#each await getProducts() as p}`) so it renders during SSR. An `{#await getCart() then cart}` block, by contrast, defers to the client. Use direct `await` when you want the data in the server-rendered HTML.
