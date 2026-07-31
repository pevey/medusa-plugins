import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../../modules/complaint'
import { ComplaintService } from '../../../../../modules/complaint/service'
import { AdminCreateComplaintActivityType, AdminDeleteComplaintActivitiesType, AdminGetComplaintActivitiesType } from '../../../../validators'

export async function GET(req: AuthenticatedMedusaRequest<AdminGetComplaintActivitiesType>, res: MedusaResponse) {
	const { q, id: complaint_id } = req.params
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: activities, metadata } = await query.graph({
		entity: 'complaint_activity',
		...req.queryConfig,
		filters: {
			complaint_id: complaint_id,
			...(q ? { description: { $ilike: `%${q}%` } } : {})
		}
	})
	res.json({
		activities,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateComplaintActivityType>, res: MedusaResponse) => {
	const { id: complaint_id } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const created = await complaintService.createComplaintActivities({
		user_id: req.auth_context?.actor_id,
		complaint_id,
		...req.validatedBody
	})

	// `createComplaintActivities` returns the raw ORM entity -- missing the `user`
	// module-link relation and carrying `deleted_at`. Re-fetch through the same
	// field selection GET .../activities uses so this matches AdminComplaintActivity.
	const {
		data: [activity]
	} = await query.graph(
		{
			entity: 'complaint_activity',
			fields: ['id', 'complaint_id', 'user_id', 'type', 'note', 'metadata', 'created_at', 'updated_at', 'user.*'],
			filters: { id: created.id }
		},
		{ throwIfKeyNotFound: true }
	)
	res.json({ activity })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteComplaintActivitiesType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.deleteComplaintActivities(ids)
	res.json({ deleted: ids })
}
