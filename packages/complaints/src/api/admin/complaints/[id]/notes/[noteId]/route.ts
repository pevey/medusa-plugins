import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { COMPLAINT_MODULE } from '../../../../../../modules/complaint'
import { ComplaintService } from '../../../../../../modules/complaint/service'
import { AdminUpdateComplaintNoteType } from '../../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateComplaintNoteType>,
	res: MedusaResponse
) => {
	const { id, noteId } = req.params
	const { note }: AdminUpdateComplaintNoteType = req.validatedBody
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const entry = await complaintService.updateNote(noteId, note)
	res.json({ entry })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { noteId } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	await complaintService.deleteComplaintActivities([noteId])
	res.json({ deleted: [noteId] })
}
