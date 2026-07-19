# medusa-js-sdk

Extended Medusa JS SDK with support for a set of [custom plugins](https://github.com/pevey/medusa-plugins). If you don't use these plugins, you probably want the official [@medusajs/js-sdk](https://www.npmjs.com/package/@medusajs/js-sdk) package instead.

Drop-in replacement for `@medusajs/js-sdk` that adds typed methods for Reviews, Content, Forms, and Analytics alongside all core Medusa storefront functionality. (No Admin functionality.)

## Installation

```bash
yarn add "medusa-js-sdk"
```

## Setup

```ts
import Medusa from 'medusa-js-sdk'

const sdk = new Medusa({
	baseUrl: 'http://localhost:9000',
	publishableKey: 'pk_...',
	auth: {
		type: 'session'
	}
})
```

All [configuration options](https://docs.medusajs.com/resources/js-sdk#configuration) from `@medusajs/js-sdk` are supported.

## Store

All core store methods from `@medusajs/js-sdk` are available unchanged:

```ts
const regions = await sdk.store.region.list()
const cart = await sdk.store.cart.create({})
const products = await sdk.store.product.list()
```

### Reviews

```ts
// List approved reviews for a product
const { reviews, count } = await sdk.store.review.list('prod_123')

// Submit a review (requires customer authentication)
const { review } = await sdk.store.review.create('prod_123', {
	rating: 5,
	body: 'Excellent quality',
	author_name: 'Alice',
	author_email: 'alice@example.com'
})
```

### Content

```ts
// List content collections
const { content_collections } = await sdk.store.content.list()

// Get a specific collection
const { content_collection } = await sdk.store.content.retrieve('blog')

// List published items in a collection
const { content_items } = await sdk.store.content.listItems('blog', {
	tag: 'announcements',
	limit: 10
})

// Get a specific content item
const { content_item } = await sdk.store.content.retrieveItem('blog', 'hello-world')
```

### Forms

```ts
// Submit a form
const { submitted } = await sdk.store.form.submit('contact', {
	data: {
		name: 'Alice',
		email: 'alice@example.com',
		message: 'Hello!'
	},
	cf_turnstile_response: 'token...' // optional, if Turnstile is enabled
})
```

### Products (Expanded Types)

`sdk.store.product.list()` and `sdk.store.product.retrieve()` return an expanded `StoreProduct` type that includes review data when the reviews plugin is installed:

```ts
const { products } = await sdk.store.product.list()

// products[0].reviews       — Review[]
// products[0].review_stats  — { average_rating: number, count: number }
```

## Admin

All core admin methods from `@medusajs/js-sdk` are available unchanged:

```ts
const { orders } = await sdk.admin.order.list()
const { products } = await sdk.admin.product.list()
```

### Reviews

```ts
// List reviews with filtering
const { reviews } = await sdk.admin.review.list({
	status: 'pending',
	product_id: 'prod_123'
})

// Get a single review
const { review } = await sdk.admin.review.retrieve('rev_123')

// Update a review
await sdk.admin.review.update('rev_123', { status: 'approved' })

// Delete a review
await sdk.admin.review.delete('rev_123')

// Bulk approve/reject
await sdk.admin.review.approve(['rev_123', 'rev_456'])
await sdk.admin.review.reject(['rev_789'])
```

## Analytics

Privacy-focused event tracking for `medusa-plugin-analytics`. Events are batched and delivered to the backend's `/store/ping` endpoint (one event or an array). Sales-channel attribution is derived server-side from the publishable key, and events are gated by the rubrics you define — so you only collect what you've configured.

There are three pieces, lowest- to highest-level.

### `store.analytics.track` — stateless primitive

Send one event or a batch straight to `/store/ping`. Use it server-side, or as the building block behind the collector and framework forwarders.

```ts
await sdk.store.analytics.track([
	{ event: 'page_view', actor_id: 'cart_123', properties: { path: '/' } },
	{ event: 'product_viewed', actor_id: 'cart_123', properties: { product_id: 'prod_1' } }
])
```

### `createAnalyticsCollector` — browser batcher (recommended)

A framework-agnostic client-side batcher: it queues events and flushes them in batches to a **same-origin endpoint** — normal flushes via `fetch`, exit events via `sendBeacon`. That endpoint is a small route in your app that forwards to Medusa with the publishable key **and stamps identity** (`actor_id`) from a server-managed `anonymous_id` cookie.

Why a same-origin endpoint instead of hitting Medusa directly? `sendBeacon` (needed to capture events as the tab closes) can't attach the publishable-key header, and the backend may not even be reachable from the browser. Routing through your own origin solves both, keeps the key server-side, and lets the server own identity — a stable anonymous id that survives across carts and orders (unlike a cart id, which is cleared on order completion), and that the client can't spoof.

```ts
import { createAnalyticsCollector } from 'medusa-js-sdk'

const analytics = createAnalyticsCollector({
	endpoint: '/api/analytics' // same-origin forwarding route (default)
})

analytics.track('product_viewed', { properties: { product_id: 'prod_1' } })
analytics.setTraits({ plan_interest: 'pro' }) // attach traits to the visitor's identity
// await analytics.flush()
// await analytics.destroy()   // flush + stop timers/handlers (on teardown)
```

Config: `{ endpoint?, batchSize?, flushInterval? }` (defaults: `/api/analytics`, `10`, `2000`ms). The collector is self-managing — it starts its own timer and unload handler, so it works without any UI component. It never sends `actor_id`; the endpoint stamps it.

#### Example: Next.js (App Router)

Give every visitor a stable anonymous id (middleware — runs on first request):

```ts
// middleware.ts
import { NextResponse } from 'next/server'
export function middleware(req) {
	const res = NextResponse.next()
	if (!req.cookies.get('aid')) {
		res.cookies.set('aid', crypto.randomUUID(), {
			httpOnly: true,
			sameSite: 'lax',
			secure: true,
			path: '/',
			maxAge: 60 * 60 * 24 * 365
		})
	}
	return res
}
```

The forwarding route (server — has the key; stamps `actor_id` from the cookie):

```tsx
// app/api/analytics/route.ts
import { cookies } from 'next/headers'
import Medusa from 'medusa-js-sdk'

const medusa = new Medusa({
	baseUrl: process.env.MEDUSA_BACKEND_URL!,
	publishableKey: process.env.MEDUSA_PUBLISHABLE_KEY!
})

export async function POST(req: Request) {
	const actor_id = (await cookies()).get('aid')?.value
	const body = await req.json()
	const events = (Array.isArray(body) ? body : [body]).map(e => ({ ...e, actor_id }))
	await medusa.store.analytics.track(events)
	return new Response(null, { status: 202 })
}
```

A client provider that mounts the collector:

```tsx
// app/analytics-provider.tsx
'use client'
import { createContext, useContext, useRef, useEffect } from 'react'
import { createAnalyticsCollector } from 'medusa-js-sdk'

const Ctx = createContext<ReturnType<typeof createAnalyticsCollector> | null>(null)
export const useAnalytics = () => useContext(Ctx)!

export function AnalyticsProvider({ children }) {
	const ref = useRef()
	ref.current ??= createAnalyticsCollector({ endpoint: '/api/analytics' })
	useEffect(() => () => ref.current.destroy(), [])
	return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>
}
```

```tsx
// app/layout.tsx → <AnalyticsProvider>{children}</AnalyticsProvider>
// any client component → useAnalytics().track('product_viewed', { properties: { id } })
```

> Using SvelteKit? `sveltekit-medusa-sdk` ships a ready-made `<Analytics>` component and forwarder, so you skip both files above.

## Authentication

Authentication works exactly like `@medusajs/js-sdk`:

```ts
// Customer login
await sdk.auth.login('customer', 'emailpass', {
	email: 'customer@example.com',
	password: 'password'
})

// Customer registration
await sdk.auth.register('customer', 'emailpass', {
	email: 'customer@example.com',
	password: 'password'
})

// Logout
await sdk.auth.logout()
```

## Raw Client

For endpoints not covered by the SDK, use `sdk.client.fetch()`:

```ts
const result = await sdk.client.fetch('/admin/custom-endpoint', {
	method: 'POST',
	body: { key: 'value' }
})
```

## Types

All types are exported for use in your application:

```ts
import type {
	// Custom plugin types
	Review,
	StoreCreateReviewInput,
	ContentCollection,
	ContentItem,
	FormSubmitInput,
	TrackOptions,

	// Expanded core types
	StoreProduct,
	AdminProduct,

	// SDK config types
	MedusaConfig,
	Config,
	ClientHeaders
} from 'medusa-js-sdk'
```
