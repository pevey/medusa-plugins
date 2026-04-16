import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FORM_MODULE } from '../../../../../modules/form'
import { FormService } from '../../../../../modules/form/service'
import {
	AdminCreateFormFieldType,
	AdminDeleteFormFieldsType,
	AdminGetFormFieldsType
} from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetFormFieldsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id: form_id } = req.params

	const { data: fields, metadata } = await query.graph({
		entity: 'form_field',
		...req.queryConfig,
		filters: { form_id }
	})

	res.json({ fields, count: metadata?.count, limit: metadata?.take, offset: metadata?.skip })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateFormFieldType>,
	res: MedusaResponse
) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	const field = await formService.createFormFields({
		form_id: req.params.id,
		...req.validatedBody
	})
	res.json({ field })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteFormFieldsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteFormFields(ids)
	res.json({ deleted: ids })
}
