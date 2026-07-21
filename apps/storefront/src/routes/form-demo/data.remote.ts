import * as v from 'valibot'
import { form } from '$app/server'

// Demo-only contact form — no DB; just echoes success.
export const contact = form(
	v.object({
		name: v.pipe(v.string(), v.nonEmpty('Name is required')),
		email: v.pipe(v.string(), v.email('Enter a valid email')),
		message: v.pipe(v.string(), v.nonEmpty('Message is required')),
		country: v.pipe(v.string(), v.nonEmpty('Select a country')),
		darkMode: v.optional(v.boolean(), false)
	}),
	async () => ({ success: true })
)
