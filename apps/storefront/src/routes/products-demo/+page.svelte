<script lang="ts">
	import * as Products from '$lib/components/ui/products'
	import * as Product from '$lib/components/ui/product'
	import { AddToCartButton } from '$lib/components/ui/cta'
</script>

<h1 class="mb-6 text-2xl font-semibold">Products</h1>

<Products.Root pageSize={8}>
	{#snippet children({ count, loading })}
		<p class="mb-4 text-sm text-muted-foreground">{loading ? 'Loading…' : `${count} products`}</p>
		<Products.Grid>
			{#snippet empty()}<p>No products found.</p>{/snippet}
		</Products.Grid>
		<div class="mt-8">
			<Products.Pagination />
		</div>
	{/snippet}
</Products.Root>

<h2 class="mt-12 mb-6 text-xl font-semibold">With an add-to-cart action</h2>

<Products.Root pageSize={4} pageParam="p2">
	{#snippet children()}
		<Products.Grid class="lg:grid-cols-2 xl:grid-cols-4">
			{#snippet children({ product })}
				<Product.Card {product}>
					{#snippet actions()}<AddToCartButton />{/snippet}
				</Product.Card>
			{/snippet}
		</Products.Grid>
		<div class="mt-8">
			<Products.Pagination />
		</div>
	{/snippet}
</Products.Root>
