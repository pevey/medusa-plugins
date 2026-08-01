<script lang="ts">
	// A cart *page* rather than a drawer. Same `Cart.*` parts the navbar drawer uses — the only
	// difference is that <Cart.Sheet>/<Cart.Trigger>/<Cart.Content> aren't wrapped around them.
	// None of the parts know or care whether they're in a sheet; they only need a <Cart.Root>
	// somewhere above them.
	import * as Cart from '$lib/components/ui/cart'
	import { Metadata } from '$lib/components/ui/seo'
</script>

<Metadata config={{ title: 'Cart', description: 'Your shopping cart' }} />

<div class="mx-auto max-w-3xl space-y-12 p-8" data-testid="cart-demo">
	<!-- 1. The composed page cart. -->
	<section class="space-y-4">
		<h1 class="text-2xl font-semibold">Your cart</h1>

		<Cart.Root
			lineHref={item => `/product/${item.product_handle}`}
			onupdate={c => console.log('cart updated', c)}
			onremove={c => console.log('item removed', c)}
		>
			<Cart.Items class="border-y">
				<!-- The per-row template. A page has room the drawer doesn't, so this row shows the
				     unit price AND the line total; the drawer's row shows only the unit price. -->
				<div class="flex flex-1 gap-4">
					<Cart.Image />
					<div class="flex min-w-0 flex-1 flex-col">
						<div class="flex justify-between gap-4">
							<Cart.Title />
							<Cart.ItemSubtotal />
						</div>
						<Cart.Price class="mt-1 font-normal text-muted-foreground" />
						<div class="mt-4 flex items-end justify-between">
							<Cart.Quantity />
							<Cart.Remove />
						</div>
					</div>
				</div>

				<!-- Without this, Cart.Items falls back to <Cart.Empty> ("Your cart is empty"). A
				     page can afford a way back out of the dead end. -->
				{#snippet empty()}
					<div class="space-y-3 py-12 text-center">
						<p class="text-muted-foreground">Your cart is empty.</p>
						<a href="/product-demo" class="text-primary underline">Browse the product demo →</a>
					</div>
				{/snippet}
			</Cart.Items>

			<div class="ml-auto max-w-xs space-y-3 pt-4">
				<Cart.Subtotal />
				<p class="text-sm text-muted-foreground">Shipping and taxes calculated at checkout.</p>
				<Cart.Checkout />
			</div>
		</Cart.Root>
	</section>

	<!-- 2. Headless: no parts at all. Root's children snippet hands over the whole cart, so you
	     can render a summary in whatever shape the page needs. Same live data as above — both
	     Roots read the same reactive getCart() query. -->
	<section class="space-y-4 border-t pt-8">
		<h2 class="text-sm font-medium text-muted-foreground">Headless summary (no Cart parts)</h2>

		<Cart.Root>
			{#snippet children({ cart, items, count, lineCount, subtotal, loading })}
				{#if loading}
					<p class="text-sm text-muted-foreground">Loading cart…</p>
				{:else if items.length}
					<dl class="grid grid-cols-2 gap-x-4 gap-y-1 text-sm" data-testid="headless-summary">
						<dt class="text-muted-foreground">Cart</dt>
						<dd>{cart?.id}</dd>
						<dt class="text-muted-foreground">Lines</dt>
						<dd>{lineCount}</dd>
						<dt class="text-muted-foreground">Units</dt>
						<dd>{count}</dd>
						<dt class="text-muted-foreground">Subtotal</dt>
						<dd>{subtotal == null ? '—' : Cart.formatPrice(subtotal, cart?.currency_code)}</dd>
					</dl>
				{:else}
					<p class="text-sm text-muted-foreground">Nothing in the cart yet.</p>
				{/if}
			{/snippet}
		</Cart.Root>
	</section>
</div>
