import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { FORM_MODULE } from '../../../../../../modules/form'
import { FormService } from '../../../../../../modules/form/service'
import { AdminUpdateFormFieldType } from '../../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateFormFieldType>,
	res: MedusaResponse
) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	const { field_options: incomingOptions, ...fieldData } = req.validatedBody

	const field = await formService.updateFormFields({ id: req.params.fieldId, ...fieldData })

	if (incomingOptions !== undefined) {
		const existing = await formService.listFormFieldOptions({ form_field_id: req.params.fieldId })
		const existingIds = new Set(existing.map(o => o.id))
		const incomingIds = new Set(incomingOptions.filter(o => o.id).map(o => o.id!))

		const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
		const toCreate = incomingOptions.filter(o => !o.id)
		const toUpdate = incomingOptions.filter(o => o.id && existingIds.has(o.id!))

		await Promise.all([
			toDelete.length > 0 ? formService.deleteFormFieldOptions(toDelete) : Promise.resolve(),
			...toCreate.map((o, i) =>
				formService.createFormFieldOptions({
					form_field_id: req.params.fieldId,
					label: o.label,
					value: o.value,
					sort_order: o.sort_order ?? i
				})
			),
			...toUpdate.map(o =>
				formService.updateFormFieldOptions({
					id: o.id!,
					label: o.label,
					value: o.value,
					sort_order: o.sort_order
				})
			)
		])
	}

	res.json({ field })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteFormFields([req.params.fieldId])
	res.json({ deleted: [req.params.fieldId] })
}
