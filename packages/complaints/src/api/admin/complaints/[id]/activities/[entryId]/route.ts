import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { COMPLAINT_MODULE } from '../../../../../../modules/complaint'
import { ComplaintService } from '../../../../../../modules/complaint/service'
import {
	AdminUpdateComplaintActivityType,
	AdminGetComplaintActivityType
} from '../../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetComplaintActivityType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve('query')
	const { entryId } = req.params

	const {
		data: [activity]
	} = await query.graph(
		{
			entity: 'complaint_activity',
			fields: req.queryConfig.fields,
			filters: { id: entryId }
		},
		{ throwIfKeyNotFound: true }
	)
	res.json({ activity })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateComplaintActivityType>,
	res: MedusaResponse
) => {
	const { id: complaintId, entryId } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const activity = await complaintService.updateComplaintActivities({
		id: entryId,
		complaint_id: complaintId,
		user_id: req.auth_context?.actor_id,
		...req.validatedBody
	})
	res.json({ activity })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { entryId } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.deleteComplaintActivities([entryId])
	res.json({ deleted: [entryId] })
}
