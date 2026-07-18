import type { Stripe, StripeElements } from '@stripe/stripe-js'
import { writable } from 'svelte/store'

export const stripeClient = writable<Stripe | null>()
export const stripeElements = writable<StripeElements | undefined>()
