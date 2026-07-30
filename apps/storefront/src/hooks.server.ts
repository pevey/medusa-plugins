import { createMedusaHandle } from 'sveltekit-medusa-sdk/server'
import { MEDUSA_BACKEND_URL, MEDUSA_PUBLISHABLE_KEY, MEDUSA_DEFAULT_REGION_ID, MEDUSA_DEFAULT_COUNTRY_CODE } from '$app/env/private'

export const handle = createMedusaHandle({
	baseUrl: MEDUSA_BACKEND_URL,
	publishableKey: MEDUSA_PUBLISHABLE_KEY,
	defaultRegionId: MEDUSA_DEFAULT_REGION_ID || undefined,
	defaultCountryCode: MEDUSA_DEFAULT_COUNTRY_CODE || undefined
})
