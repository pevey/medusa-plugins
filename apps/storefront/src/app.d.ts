import type { MedusaContext } from '@pevey/sveltekit-medusa-sdk'

declare global {
	namespace App {
		interface Locals {
			medusa: MedusaContext
		}
	}
}
export {}
