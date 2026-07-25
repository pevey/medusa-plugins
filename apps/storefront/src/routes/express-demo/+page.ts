import { getProductQuery } from 'sveltekit-medusa-sdk'

// Load the Test product server-side so the wallet button can render with its price (SSR).
export const load = async () => {
	return {
		product: await getProductQuery({ slug: 'test' })
	}
}
