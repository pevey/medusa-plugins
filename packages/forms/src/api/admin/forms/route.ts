import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FORM_MODULE } from '../../../modules/form'
import { FormService } from '../../../modules/form/service'
import {
	AdminCreateFormType,
	AdminDeleteFormsType,
	AdminGetFormsType
} from '../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetFormsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { q, active, ...rest } = req.validatedQuery

	const { data: forms, metadata } = await query.graph({
		entity: 'form',
		...req.queryConfig,
		filters: {
			...(active != null ? { active } : {}),
			...(q ? { $or: [{ name: { $ilike: `%${q}%` } }, { handle: { $ilike: `%${q}%` } }] } : {})
		}
	})

	res.json({ forms, count: metadata?.count, limit: metadata?.take, offset: metadata?.skip })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateFormType>,
	res: MedusaResponse
) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	const { form_fields: fieldInputs, ...formData } = req.validatedBody

	const form = await formService.createForms(formData as any)

	if (fieldInputs?.length) {
		await formService.createFormFields(
			fieldInputs.map((f, i) => ({
				...f,
				form_id: form.id,
				sort_order: f.sort_order ?? i
			}))
		)
	}

	res.json({ form })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteFormsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteForms(ids)
	res.json({ deleted: ids })
}
