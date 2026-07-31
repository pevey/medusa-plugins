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
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { tag_ids: tags, ...rest } = req.validatedBody
	const complaint = await complaintService.createComplaints({ ...rest, tags })
	await complaintService.addOpenEntry(complaint.id, req.auth_context.actor_id)

	// `createComplaints` returns the raw ORM entity -- it carries `deleted_at` and
	// uninitialized `tags`/`activity`/`documents` Collection proxies, none of which
	// belong in the admin contract. `customer`/`order`/`product` are module-link
	// relations that only exist via query.graph, not on the raw entity either.
	// Re-fetch through the same field selection GET /admin/complaints/:id uses so
	// the create response matches that shape exactly.
	const {
		data: [created]
	} = await query.graph(
		{
			entity: 'complaint',
			fields: [
				'id',
				'number',
				'status',
				'description',
				'created_at',
				'updated_at',
				'customer_id',
				'order_id',
				'product_id',
				'stock_lot_id',
				'serial_number_id',
				'actionable',
				'reportable',
				'tags.*',
				'customer.*',
				'order.*',
				'product.*'
			],
			filters: { id: complaint.id }
		},
		{ throwIfKeyNotFound: true }
	)
	res.json({ complaint: created })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteComplaintsType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	await deleteComplaintsWithDocumentsWorkflow(req.scope).run({ input: { ids } })
	res.json({ deleted: ids })
}
