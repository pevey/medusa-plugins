import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../modules/complaint'
import { ComplaintService } from '../../../../modules/complaint/service'
import { AdminGetComplaintTagType, AdminUpdateComplaintTagType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetComplaintTagType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const {
		data: [complaintTag]
	} = await query.graph(
		{
			entity: 'complaint_tag',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)

	res.json({ complaint_tag: complaintTag })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateComplaintTagType>,
	res: MedusaResponse
) => {
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const { id } = req.params
	const complaintTag = await complaintService.updateComplaintTags({
		id,
		...req.validatedBody
	})
	res.json({ complaint_tag: complaintTag })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.deleteComplaintTags([id])
	res.json({ deleted: [id] })
}
