import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { COMPLAINT_MODULE } from '../../../../../modules/complaint'
import { ComplaintService } from '../../../../../modules/complaint/service'
import { AdminCreateComplaintNoteType } from '../../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminCreateComplaintNoteType>,
	res: MedusaResponse
) => {
	const { id: complaint_id } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const entry = await complaintService.addNote(
		complaint_id,
		req.auth_context.actor_id,
		req.validatedBody.note
	)
	res.json({ entry })
}
