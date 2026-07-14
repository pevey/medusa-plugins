<script lang="ts">
	import { getRegions, getProducts } from 'sveltekit-medusa-sdk'
</script>

<h1>Regions</h1>
<ul>
	{#each await getRegions() as region}
		<li>{region.name} ({region.currency_code})</li>
	{/each}
</ul>

<h1>Products</h1>
<ul>
	{#each await getProducts() as product}
		<li>{product.title}</li>
	{:else}
		<li>No products</li>
	{/each}
</ul>
