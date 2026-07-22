import { getProductQuery } from 'sveltekit-medusa-sdk'

// Fetch server-side in load so the product content is SSR'd (SEO). On a real product
// route this uses params.slug. `+variants.inventory_quantity` so option availability
// knows stock.
export const load = async () => {
	return {
		product: await getProductQuery({ slug: 'test', fields: '+variants.inventory_quantity' })
	}
}
