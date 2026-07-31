import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../../../modules/complaint'
import { ComplaintService } from '../../../../../../modules/complaint/service'
import { AdminUpdateComplaintNoteType } from '../../../../../validators'

export const POST = async (req: AuthenticatedMedusaRequest<AdminUpdateComplaintNoteType>, res: MedusaResponse) => {
	const { id, noteId } = req.params
	const { note }: AdminUpdateComplaintNoteType = req.validatedBody
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const updated = await complaintService.updateNote(noteId, note)

	// See POST /admin/complaints/:id/notes -- `updateNote` returns the raw ORM
	// entity, so re-fetch through the same field selection GET .../activities uses.
	const {
		data: [entry]
	} = await query.graph(
		{
			entity: 'complaint_activity',
			fields: ['id', 'complaint_id', 'user_id', 'type', 'note', 'metadata', 'created_at', 'updated_at', 'user.*'],
			filters: { id: updated.id }
		},
		{ throwIfKeyNotFound: true }
	)
	res.json({ entry })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { noteId } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.deleteComplaintActivities([noteId])
	res.json({ deleted: [noteId] })
}
