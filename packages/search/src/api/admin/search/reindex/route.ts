import { MedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import reindexSearchDocumentsWorkflow from '../../../../workflows/reindex-search-documents'

export async function POST(req: MedusaRequest, res: MedusaResponse) {
	const { result } = await reindexSearchDocumentsWorkflow(req.scope).run({})
	return res.json(result)
}
