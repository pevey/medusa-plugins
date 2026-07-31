import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../../modules/complaint'
import { ComplaintService } from '../../../../../modules/complaint/service'
import { AdminCreateComplaintNoteType } from '../../../../validators'

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateComplaintNoteType>, res: MedusaResponse) => {
	const { id: complaint_id } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const created = await complaintService.addNote(complaint_id, req.auth_context.actor_id, req.validatedBody.note)

	// `addNote` (via createComplaintActivities) returns the raw ORM entity --
	// missing the `user` module-link relation and carrying `deleted_at`. Re-fetch
	// through the same field selection GET .../activities uses so the note entry
	// matches AdminComplaintActivity exactly.
	const {
		data: [entry]
	} = await query.graph(
		{
			entity: 'complaint_activity',
			fields: ['id', 'complaint_id', 'user_id', 'type', 'note', 'metadata', 'created_at', 'updated_at', 'user.*'],
			filters: { id: created.id }
		},
		{ throwIfKeyNotFound: true }
	)
	res.json({ entry })
}
