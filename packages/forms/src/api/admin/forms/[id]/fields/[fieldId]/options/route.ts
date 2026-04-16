import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { FORM_MODULE } from '../../../../../../../modules/form'
import { FormService } from '../../../../../../../modules/form/service'
import {
	AdminCreateFormFieldOptionType,
	AdminDeleteFormFieldOptionsType
} from '../../../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateFormFieldOptionType>,
	res: MedusaResponse
) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	const option = await formService.createFormFieldOptions({
		form_field_id: req.params.fieldId,
		...req.validatedBody
	})
	res.json({ option })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteFormFieldOptionsType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteFormFieldOptions(ids)
	res.json({ deleted: ids })
}
