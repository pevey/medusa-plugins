import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../../modules/complaint'
import { ComplaintService } from '../../../../../modules/complaint/service'
import {
	AdminCreateComplaintActivityType,
	AdminDeleteComplaintActivitiesType,
	AdminGetComplaintActivitiesType
} from '../../../../validators'

export async function GET(
	req: AuthenticatedMedusaRequest<AdminGetComplaintActivitiesType>,
	res: MedusaResponse
) {
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

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateComplaintActivityType>,
	res: MedusaResponse
) => {
	const { id: complaint_id } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const activity = await complaintService.createComplaintActivities({
		user_id: req.auth_context?.actor_id,
		complaint_id,
		...req.validatedBody
	})
	res.json({ activity })
}

export const DELETE = async (
	req: AuthenticatedMedusaRequest<AdminDeleteComplaintActivitiesType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.deleteComplaintActivities(ids)
	res.json({ deleted: ids })
}
