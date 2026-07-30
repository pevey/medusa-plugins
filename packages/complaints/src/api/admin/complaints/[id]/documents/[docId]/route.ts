import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../../../modules/complaint'
import { ComplaintService } from '../../../../../../modules/complaint/service'
import { deleteComplaintDocumentsWorkflow } from '../../../../../../workflows/delete-complaint-documents'

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id, docId } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)

	const document = await complaintService.retrieveComplaintDocument(docId)
	if (document.complaint_id !== id) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Document ${docId} does not belong to complaint ${id}`)
	}

	await deleteComplaintDocumentsWorkflow(req.scope).run({
		input: { ids: [docId] }
	})

	res.json({ deleted: [docId] })
}
