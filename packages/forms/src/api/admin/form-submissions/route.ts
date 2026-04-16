import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FORM_MODULE } from '../../../modules/form'
import { FormService } from '../../../modules/form/service'
import { AdminDeleteFormSubmissionsType, AdminGetFormSubmissionsType } from '../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetFormSubmissionsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { form_id, status } = req.validatedQuery

	const { data: form_submissions, metadata } = await query.graph({
		entity: 'form_submission',
		...req.queryConfig,
		filters: {
			...(form_id ? { form_id } : {}),
			...(status ? { status } : {})
		}
	})

	res.json({
		form_submissions,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteFormSubmissionsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteFormSubmissions(ids)
	res.json({ deleted: ids })
}
