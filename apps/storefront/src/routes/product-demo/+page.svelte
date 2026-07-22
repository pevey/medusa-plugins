<script lang="ts">
	import * as Product from '$lib/components/ui/product'
	import ThemeButton from '$lib/components/ui/theme/theme-button.svelte'

	// Product is fetched in +page.ts `load` (SSR'd), passed in as a resolved prop — no
	// async, no boundary, so the whole family renders during SSR (the no-$effect payoff).
	let { data } = $props()
</script>

<div class="mx-auto max-w-2xl space-y-6 p-8" data-testid="product-demo">
	<ThemeButton />

	<Product.Root product={data.product}>
		<Product.Title />
		<Product.Subtitle />
		<Product.Description />
		<Product.Options>
			{#each data.product?.options ?? [] as option (option.id)}
				<Product.OptionButton {option} />
			{/each}
		</Product.Options>
		<Product.Price />
	</Product.Root>
</div>
