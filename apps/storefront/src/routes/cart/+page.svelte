<script lang="ts">
  import { getCart, addToCart } from '@pevey/sveltekit-medusa-sdk'
  let variantId = $state('')
</script>

<h1>Cart</h1>

<form onsubmit={async (e) => { e.preventDefault(); await addToCart({ variant_id: variantId, quantity: 1 }) }}>
  <input placeholder="variant id" bind:value={variantId} />
  <button>Add to cart</button>
</form>

<ul>
  {#each (await getCart())?.items ?? [] as item}
    <li>{item.title} × {item.quantity}</li>
  {:else}
    <li>Cart is empty</li>
  {/each}
</ul>
