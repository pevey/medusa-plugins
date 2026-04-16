import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { FORM_MODULE } from '../../../../modules/form'
import { FormService } from '../../../../modules/form/service'
import { AdminGetFormType, AdminUpdateFormType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetFormType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const {
		data: [form]
	} = await query.graph(
		{ entity: 'form', ...req.queryConfig, filters: { id } },
		{ throwIfKeyNotFound: true }
	)

	res.json({ form })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateFormType>,
	res: MedusaResponse
) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	const { form_fields: incomingFields, ...formData } = req.validatedBody

	const form = await formService.updateForms({ id: req.params.id, ...formData } as any)

	if (incomingFields !== undefined) {
		const existing = await formService.listFormFields({ form_id: req.params.id })
		const existingIds = new Set(existing.map(f => f.id))
		const incomingIds = new Set(incomingFields.filter(f => f.id).map(f => f.id!))

		const toDelete = [...existingIds].filter(id => !incomingIds.has(id))
		const toCreate = incomingFields.filter(f => !f.id)
		const toUpdate = incomingFields.filter(f => f.id && existingIds.has(f.id!))

		if (toDelete.length > 0) {
			await formService.deleteFormFields(toDelete)
		}
		if (toCreate.length > 0) {
			await formService.createFormFields(
				toCreate.map((f, i) => ({
					form_id: req.params.id,
					name: f.name,
					label: f.label,
					field_type: f.field_type,
					required: f.required ?? false,
					sort_order: f.sort_order ?? i
				}))
			)
		}
		if (toUpdate.length > 0) {
			await formService.updateFormFields(
				toUpdate.map(f => ({
					id: f.id!,
					name: f.name,
					label: f.label,
					field_type: f.field_type,
					required: f.required ?? false,
					sort_order: f.sort_order
				}))
			)
		}
	}

	res.json({ form })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const formService: FormService = req.scope.resolve(FORM_MODULE)
	await formService.deleteForms([req.params.id])
	res.json({ deleted: [req.params.id] })
}
