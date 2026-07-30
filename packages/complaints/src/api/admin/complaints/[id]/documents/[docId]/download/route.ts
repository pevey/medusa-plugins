import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { MedusaError, Modules } from '@medusajs/framework/utils'
import { COMPLAINT_MODULE } from '../../../../../../../modules/complaint'
import { ComplaintService } from '../../../../../../../modules/complaint/service'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id, docId } = req.params
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)

	const document = await complaintService.retrieveComplaintDocument(docId)
	if (document.complaint_id !== id) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Document ${docId} does not belong to complaint ${id}`)
	}

	const fileService = req.scope.resolve(Modules.FILE)
	const provider = fileService.getProvider()

	const url = await provider.getPresignedDownloadUrl({
		fileKey: document.file_key,
		access: 'private'
	} as any)

	res.json({ url, filename: document.filename, mime_type: document.mime_type })
}
