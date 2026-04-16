import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError, Modules } from '@medusajs/framework/utils'
import { FORM_MODULE } from '../../../modules/form'
import { FormService } from '../../../modules/form/service'
import { StoreSubmitFormType } from '../../validators'

type FormWithFields = {
	id: string
	active: boolean
	turnstile_enabled: boolean
	form_fields:
		| {
				name: string
				label: string
				required: boolean
		  }[]
		| null
}

async function validateTurnstileToken(token: string, secret: string): Promise<boolean> {
	const response = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
		method: 'POST',
		headers: { 'content-type': 'application/json' },
		body: JSON.stringify({ response: token, secret })
	})
	const data = (await response.json()) as { success: boolean }
	return data.success
}

export const POST = async (req: MedusaRequest<StoreSubmitFormType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const formService: FormService = req.scope.resolve(FORM_MODULE)

	// Look up form by handle, include fields for validation
	const { data: forms } = await query.graph({
		entity: 'form',
		fields: [
			'id',
			'active',
			'turnstile_enabled',
			'form_fields.name',
			'form_fields.label',
			'form_fields.required'
		],
		filters: { handle: req.params.handle }
	})

	const form = forms[0] as FormWithFields | undefined

	if (!form) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Form "${req.params.handle}" not found`)
	}

	if (!form.active) {
		throw new MedusaError(
			MedusaError.Types.NOT_ALLOWED,
			`Form "${req.params.handle}" is not accepting submissions`
		)
	}

	const { token, data } = req.validatedBody

	// ── Sanitize data immediately: strip unknown fields and cap value sizes ──
	const MAX_FIELD_VALUE_LENGTH = 10_000
	const configuredFields = form.form_fields ?? []
	const allowedFieldNames = new Set(configuredFields.map(f => f.name))
	const filteredData: Record<string, unknown> = {}
	for (const key of Object.keys(data)) {
		if (!allowedFieldNames.has(key)) continue
		const val = data[key]
		if (typeof val === 'string' && val.length > MAX_FIELD_VALUE_LENGTH) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Field "${key}" exceeds maximum length of ${MAX_FIELD_VALUE_LENGTH} characters`
			)
		}
		filteredData[key] = val
	}

	// Validate Turnstile token if required
	if (form.turnstile_enabled) {
		if (!token) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Turnstile token is required')
		}
		const { turnstileSecretKey } = formService.getOptions()
		if (!turnstileSecretKey) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				'Turnstile is not configured on the server'
			)
		}
		const valid = await validateTurnstileToken(token, turnstileSecretKey)
		if (!valid) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Turnstile verification failed')
		}
	}

	// Validate required fields (against already-filtered data)
	const missingFields = configuredFields
		.filter(f => f.required && (filteredData[f.name] == null || filteredData[f.name] === ''))
		.map(f => f.label)

	if (missingFields.length > 0) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`Missing required fields: ${missingFields.join(', ')}`
		)
	}

	const submission = await formService.createFormSubmissions({
		form_id: form.id,
		data: filteredData,
		ip_address:
			(req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ?? req.ip ?? null,
		user_agent: req.headers['user-agent'] ?? null
	})

	const eventBus = req.scope.resolve(Modules.EVENT_BUS)
	await eventBus.emit({ name: 'form.submitted', data: { id: submission.id } })

	res.status(201).json({ submitted: true })
}
