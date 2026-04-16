import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { FORM_MODULE } from '../../../../../../../../modules/form'
import { FormService } from '../../../../../../../../modules/form/service'
import { AdminUpdateFormFieldOptionType } from '../../../../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateFormFieldOptionType>,
	res: MedusaResponse
) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	const option = await formService.updateFormFieldOptions({
		id: req.params.optionId,
		...req.validatedBody
	})
	res.json({ option })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteFormFieldOptions([req.params.optionId])
	res.json({ deleted: [req.params.optionId] })
}
