import { defineEnvVars } from '@sveltejs/kit/env'
import * as v from 'valibot'

// SvelteKit 3 replaced `$env/*` with explicit environment variables. Every var
// the app reads must be declared here; private vars import from `$app/env/private`.
// Values still come from `.env` by matching name. The default region/country are
// optional (the app falls back to the backend's default), so they use an optional
// schema — without one, a missing value fails validation and the app won't start.
export const variables = defineEnvVars({
	MEDUSA_BACKEND_URL: { schema: v.string() },
	MEDUSA_PUBLISHABLE_KEY: { schema: v.string() },
	MEDUSA_DEFAULT_REGION_ID: { schema: v.optional(v.string()) },
	MEDUSA_DEFAULT_COUNTRY_CODE: { schema: v.optional(v.string()) }
})
