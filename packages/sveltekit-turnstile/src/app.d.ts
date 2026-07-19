// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
import type { TurnstileInstance } from './lib/types.js'

declare global {
	namespace App {
		// interface Error {}
		// interface Locals {}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
	interface Window {
		turnstile: TurnstileInstance
	}
}

export {}
