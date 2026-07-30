import * as v from 'valibot'
import { form } from '$app/server'

const optional = () => v.optional(v.string(), '')

const addressSchema = v.object({
	email: v.optional(v.pipe(v.string(), v.email('Enter a valid email')), ''),
	hideBilling: v.optional(v.boolean(), true),
	first_name: optional(),
	last_name: optional(),
	address_1: optional(),
	address_2: optional(),
	city: optional(),
	province: optional(),
	postal_code: optional(),
	country_code: v.pipe(v.string(), v.nonEmpty('Select a country')),
	phone: optional(),
	company: optional(),
	billing_first_name: optional(),
	billing_last_name: optional(),
	billing_address_1: optional(),
	billing_address_2: optional(),
	billing_city: optional(),
	billing_province: optional(),
	billing_postal_code: optional(),
	billing_country_code: optional(),
	billing_phone: optional(),
	billing_company: optional()
})

const handler = async () => ({ success: true })

// Two independent forms so each demo route attaches one top-level remote form to one <form>.
export const address = form(addressSchema, handler)
export const addressCompose = form(addressSchema, handler)
export const addressCollapsed = form(addressSchema, handler)
