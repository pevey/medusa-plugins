import type { MedusaContext } from 'sveltekit-medusa-sdk'

declare global {
	namespace App {
		interface Locals {
			medusa: MedusaContext
		}
	}
}
export {}
