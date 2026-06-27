import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { generateComplaintsPdfExportWorkflow } from '../../../../workflows/generate-complaints-pdf-export'
import { AdminGenerateComplaintsPdfExportType } from '../../../validators'

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminGenerateComplaintsPdfExportType>,
	res: MedusaResponse
) => {
	const { ids } = req.validatedBody
	const requested_by = req.auth_context?.actor_id ?? null

	const { transaction } = await generateComplaintsPdfExportWorkflow(req.scope).run({
		input: { complaint_ids: ids, requested_by }
	})

	res.status(202).json({ transaction_id: transaction.transactionId })
}
