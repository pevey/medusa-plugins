<script lang="ts">
	import * as Product from '$lib/components/ui/product'
	import { Metadata } from '$lib/components/ui/seo'
	import { AddToCartButton, AddToCartToggle } from '$lib/components/ui/cta'
	import { CartDrawer } from '$lib/components/ui/cart'
	import { getCart } from 'sveltekit-medusa-sdk'
	import ThemeButton from '$lib/components/ui/theme/theme-button.svelte'

	// Product is fetched in +page.ts `load` (SSR'd), passed in as a resolved prop — no
	// async, no boundary, so the whole family renders during SSR (the no-$effect payoff).
	let { data } = $props()

	const variants = $derived(data.product?.variants ?? [])
	// A stand-in "add-on" variant for the toggle demo (first variant of this product).
	const addonVariantId = 'variant_01KY660P7C8KKMHGM01WE81G5M'

	// Reactive cart — the SDK's addToCart/removeFromCart push into getCart(), so this
	// read-out updates live as you add/toggle. `await` in `$derived` needs experimental.async
	// (enabled in vite.config.ts) and a <svelte:boundary> wherever `cart` is read.
	const cart = $derived(await getCart())
</script>

<!-- Per-page <title>/description/canonical/OG/Twitter tags; merges MetaProvider site defaults. -->
<Metadata
	config={{ title: data.product?.title, description: data.product?.description ?? undefined }}
/>

<div class="mx-auto max-w-2xl space-y-8 p-8" data-testid="product-demo">
	<ThemeButton />
	<CartDrawer
		onupdate={c => console.log('cart updated', c)}
		onremove={c => console.log('item removed', c)}
		onerror={e => console.error('cart error', e)}
	/>

	<!-- 1. In-context flow: options + quantity + add all read from Product context.
	     URL carries ?v= (variant) and ?quantity=; refresh/share reproduces the selection. -->
	<Product.Root product={data.product}>
		<!-- Emits Product JSON-LD (name/description/image/Offer|AggregateOffer/availability, plus
		     review aggregate when the route includes `review`). `transform` lets you graft extra
		     fields onto the auto schema, e.g. a brand:
		<Product.JsonLd
			transform={(schema) => ({ ...schema, brand: { '@type': 'Brand', name: 'Test' } })}
		/> -->
		<Product.JsonLd />
		<Product.Title />
		<Product.Subtitle />
		<Product.Description />
		<Product.Options>
			{#each data.product?.options ?? [] as option (option.id)}
				<Product.OptionButton {option} />
			{/each}
		</Product.Options>
		<Product.Price />

		<div class="flex items-end gap-4">
			<label class="flex flex-col gap-1">
				<span class="text-sm font-medium">Quantity</span>
				<Product.QuantitySelect maxQuantity={5} class="w-24" />
			</label>
			<!-- No props: variant + quantity come from context. -->
			<AddToCartButton />
			<AddToCartButton quantity={3}>Buy 3</AddToCartButton>
		</div>
	</Product.Root>

	<!-- 2. Standalone CTA (outside Product.Root): explicit props win. A fixed "Buy 3". -->
	<section class="space-y-2 border-t pt-6">
		<h2 class="text-sm font-medium text-muted-foreground">Standalone CTA (explicit props)</h2>
		<AddToCartButton variantId={addonVariantId}>Add To Cart Standalone</AddToCartButton>
	</section>

	<!-- 3. Add-on toggle: membership toggle for a variant (checkbox reflects whether it's
	     already in the cart). Add a `condition` (e.g. { collectionTitle: 'X', minQuantity: 1 })
	     to only show it when the cart already holds a matching product. -->
	{#if addonVariantId}
		<section class="space-y-2 border-t pt-6">
			<h2 class="text-sm font-medium text-muted-foreground">Add-on toggle (cart membership)</h2>
			<AddToCartToggle variantId={addonVariantId} />
		</section>
	{/if}

	<!-- 4. Live cart read-out so the effects above are visible. -->
	<section class="space-y-2 border-t pt-6">
		<h2 class="text-sm font-medium text-muted-foreground">Cart</h2>
		<svelte:boundary>
			{#snippet pending()}
				<p class="text-sm text-muted-foreground">Loading cart…</p>
			{/snippet}
			{#if cart?.items?.length}
				<ul class="space-y-1 text-sm" data-testid="cart-lines">
					{#each cart.items as item (item.id)}
						<li>{item.product_title} — {item.variant_title} × {item.quantity}</li>
					{/each}
				</ul>
			{:else}
				<p class="text-sm text-muted-foreground" data-testid="cart-empty">Cart is empty.</p>
			{/if}
		</svelte:boundary>
	</section>

	<nav class="flex flex-col gap-2 border-t pt-6">
		<a href="/checkout-auto" class="text-primary text-lg font-medium underline"
			>→ Checkout (auto)</a
		>
		<a href="/express-demo" class="text-primary text-lg font-medium underline"
			>→ Express Checkout (wallet buy)</a
		>
	</nav>
</div>
