import * as v from 'valibot'
import { form } from '$app/server'

export const address = form(
	v.object({
		country_code: v.pipe(v.string(), v.nonEmpty('Select a country')),
		province: v.optional(v.string(), ''),
		postal_code: v.optional(v.string(), '')
	}),
	async () => ({ success: true })
)
