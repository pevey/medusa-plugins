import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { uploadComplaintDocumentsWorkflow } from '../../../../../workflows/upload-complaint-documents'
import { AdminGetComplaintDocumentsType } from '../../../../validators'

export const GET = async (
	req: AuthenticatedMedusaRequest<AdminGetComplaintDocumentsType>,
	res: MedusaResponse
) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { id } = req.params

	const { data: documents, metadata } = await query.graph({
		entity: 'complaint_document',
		...req.queryConfig,
		filters: { complaint_id: id }
	})

	res.json({
		documents,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const { id } = req.params
	const file = (req as any).file as Express.Multer.File | undefined

	if (!file) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, 'No file was uploaded')
	}

	const { result } = await uploadComplaintDocumentsWorkflow(req.scope).run({
		input: {
			complaint_id: id,
			uploaded_by: req.auth_context?.actor_id ?? null,
			files: [
				{
					filename: file.originalname,
					mimeType: file.mimetype,
					content: file.buffer.toString('base64'),
					size_bytes: file.size
				}
			]
		}
	})

	res.json({ document: result[0] })
}
