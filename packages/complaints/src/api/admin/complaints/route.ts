import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../modules/complaint'
import { ComplaintService } from '../../../modules/complaint/service'
import { ComplaintStatus } from '../../../modules/complaint/models/complaint'
import { deleteComplaintsWithDocumentsWorkflow } from '../../../workflows/delete-complaints-with-documents'
import { AdminCreateComplaintType, AdminDeleteComplaintsType, AdminGetComplaintsType } from '../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminGetComplaintsType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

	const { customer_id, order_id, product_id, status, actionable, reportable, q } = req.validatedQuery

	const { data: complaints, metadata } = await query.graph({
		entity: 'complaint',
		...req.queryConfig,
		filters: {
			...(customer_id ? { customer_id } : {}),
			...(order_id ? { order_id } : {}),
			...(product_id ? { product_id } : {}),
			...(status !== undefined ? (status === 'closed' ? { status: ComplaintStatus.CLOSED } : { status: ComplaintStatus.OPEN }) : {}),
			...(actionable !== undefined ? { actionable } : {}),
			...(reportable !== undefined ? { reportable } : {}),
			...(q ? { description: { $ilike: `%${q}%` } } : {})
		}
	})

	res.json({
		complaints,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateComplaintType>, res: MedusaResponse) => {
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const { tag_ids: tags, ...rest } = req.validatedBody
	const complaint = await complaintService.createComplaints({ ...rest, tags })
	const historyEntry = await complaintService.addOpenEntry(complaint.id, req.auth_context.actor_id)
	res.json({ complaint })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteComplaintsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	await deleteComplaintsWithDocumentsWorkflow(req.scope).run({ input: { ids } })
	res.json({ deleted: ids })
}
