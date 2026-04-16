import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../modules/complaint'
import { ComplaintService } from '../../../../modules/complaint/service'
import { AdminGetComplaintType, AdminUpdateComplaintType } from '../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetComplaintType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const {
		data: [complaint]
	} = await query.graph(
		{
			entity: 'complaint',
			fields: req.queryConfig.fields,
			filters: { id }
		},
		{ throwIfKeyNotFound: true }
	)
	res.json({ complaint })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateComplaintType>,
	res: MedusaResponse
) => {
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const { id } = req.params
	const currentComplaint = await complaintService.retrieveComplaint(id)
	const complaint = await complaintService.updateComplaints({
		id,
		...req.validatedBody
	})
	if (currentComplaint.status !== complaint.status) {
		if (complaint.status === 'open') {
			await complaintService.addOpenEntry(id, req.auth_context.actor_id)
		} else if (complaint.status === 'closed') {
			await complaintService.addCloseEntry(id, req.auth_context.actor_id)
		}
	}
	res.json({ complaint })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.deleteComplaints([id])
	res.json({ deleted: [id] })
}
