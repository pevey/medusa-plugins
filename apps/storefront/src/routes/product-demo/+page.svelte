<script lang="ts">
	import * as Product from '$lib/components/ui/product'
	import * as Reviews from '$lib/components/ui/reviews'
	import Review from '$lib/components/ui/review'
	import { Metadata } from '$lib/components/ui/seo'
	import { AddToCartButton, AddToCartToggle } from '$lib/components/ui/cta'
	import { CartDrawer } from '$lib/components/ui/cart'
	import { getCart, getProduct } from 'sveltekit-medusa-sdk'
	import ThemeButton from '$lib/components/ui/theme/theme-button.svelte'
	import { SignedIn } from '$lib/components/ui/customer'
	import { Button } from '$lib/components/ui/button'

	const product = $derived(
		await getProduct({
			slug: 'test',
			fields: '+variants.inventory_quantity,*review'
		})
	)
	// A stand-in "add-on" variant for the toggle demo (first variant of this product).
	const addonVariantId = 'variant_01KY660P7C8KKMHGM01WE81G5M'

	// Controls the review-submission form (opened by the login-gated "Write a review" button).
	let reviewFormOpen = $state(false)

	// Reactive cart — the SDK's addToCart/removeFromCart push into getCart(), so this
	// read-out updates live as you add/toggle. `await` in `$derived` needs experimental.async
	// (enabled in vite.config.ts) and a <svelte:boundary> wherever `cart` is read.
	const cart = $derived(await getCart())
</script>

<!-- Per-page <title>/description/canonical/OG/Twitter tags; merges MetaProvider site defaults. -->
<Metadata config={{ title: product?.title, description: product?.description ?? undefined }} />

<div class="mx-auto max-w-2xl space-y-8 p-8" data-testid="product-demo">
	<ThemeButton />
	<CartDrawer onupdate={c => console.log('cart updated', c)} onremove={c => console.log('item removed', c)} onerror={e => console.error('cart error', e)} />

	<!-- 1. In-context flow: options + quantity + add all read from Product context.
	     URL carries ?v= (variant) and ?quantity=; refresh/share reproduces the selection. -->
	<Product.Root {product}>
		<!-- Emits Product JSON-LD (name/description/image/Offer|AggregateOffer/availability, plus
		     review aggregate when the route includes `review`). `transform` lets you graft extra
		     fields onto the auto schema, e.g. a brand:
		<Product.JsonLd
			transform={(schema) => ({ ...schema, brand: { '@type': 'Brand', name: 'Test' } })}
		/> -->
		<Product.JsonLd />
		<Product.Rating />
		<Product.Title />
		<Product.Subtitle />
		<Product.Description />
		<Product.Options>
			{#each product?.options ?? [] as option (option.id)}
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

	<!-- Reviews (under the product): aggregate summary + list + pagination. The "Write a
	     review" button and submission form appear only for signed-in customers. This section
	     is a sibling of <Product.Root> (not nested inside it), so pass productId explicitly —
	     Reviews.Root only auto-detects it from an ambient <Product.Root> when nested within one. -->
	<section class="space-y-4 border-t pt-6" data-testid="product-reviews">
		<h2 class="text-sm font-medium text-muted-foreground">Reviews</h2>
		<Reviews.Root productId={product?.id}>
			<!-- Aggregate summary — renders only once the product has approved reviews. -->
			<div class="flex items-center gap-3">
				<Reviews.Summary.Stars />
				<Reviews.Summary.Average />
				<Reviews.Summary.Count />
			</div>

			<!-- Login-gated: the button shows only for signed-in customers and opens the form. -->
			<SignedIn>
				<Button size="sm" onclick={() => (reviewFormOpen = true)}>Write a review</Button>
			</SignedIn>
			<Reviews.Form bind:open={reviewFormOpen}>
				<Reviews.Form.Author />
				<Reviews.Form.Rating />
				<Reviews.Form.Title />
				<Reviews.Form.Body />
				<Reviews.Form.Error />
				<div class="flex gap-2">
					<Reviews.Form.Submit>Submit review</Reviews.Form.Submit>
					<Reviews.Form.Cancel>Cancel</Reviews.Form.Cancel>
				</div>
			</Reviews.Form>

			<!-- Sort control + the review list + pagination. -->
			<Reviews.Sort />
			<Reviews.List>
				<Review>
					<div class="flex items-center gap-2">
						<Review.Rating />
						<Review.Title />
					</div>
					<span class="text-sm text-muted-foreground">by <Review.Author /> · <Review.Date /></span>
					<Review.Body />
				</Review>
			</Reviews.List>
			<Reviews.Pagination>
				<Reviews.Pagination.Prev />
				<Reviews.Pagination.Info />
				<Reviews.Pagination.Next />
			</Reviews.Pagination>
		</Reviews.Root>
	</section>

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
		<a href="/checkout-auto" class="text-lg font-medium text-primary underline">→ Checkout (auto)</a>
		<a href="/express-demo" class="text-lg font-medium text-primary underline">→ Express Checkout (wallet buy)</a>
	</nav>
</div>
