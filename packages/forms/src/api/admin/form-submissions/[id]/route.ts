import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FORM_MODULE } from '../../../../modules/form'
import { FormService } from '../../../../modules/form/service'
import { SubmissionStatus } from '../../../../modules/form/models/form-submission'
import { AdminGetFormSubmissionType, AdminUpdateFormSubmissionType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetFormSubmissionType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const {
		data: [form_submission]
	} = await query.graph(
		{ entity: 'form_submission', ...req.queryConfig, filters: { id: req.params.id } },
		{ throwIfKeyNotFound: true }
	)

	res.json({ form_submission })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateFormSubmissionType>,
	res: MedusaResponse
) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	const form_submission = await formService.updateFormSubmissions({
		id: req.params.id,
		status: req.validatedBody.status as SubmissionStatus
	})
	res.json({ form_submission })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteFormSubmissions([req.params.id])
	res.json({ deleted: [req.params.id] })
}
