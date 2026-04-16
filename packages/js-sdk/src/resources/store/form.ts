// Source: packages/forms/src/api/ + packages/forms/src/api/validators.ts
// Routes: POST /forms/:handle

import type { Client, ClientHeaders } from '@medusajs/js-sdk'
import type { FormSubmitInput, FormSubmitResponse } from '../../types/form'

export function createStoreFormResource(client: Client) {
	return {
		submit: async (
			handle: string,
			body: FormSubmitInput,
			headers?: ClientHeaders,
		) => {
			return client.fetch<FormSubmitResponse>(
				`/forms/${handle}`,
				{ method: 'POST', body, headers },
			)
		},
	}
}
