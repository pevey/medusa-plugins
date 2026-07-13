import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { buildAndUpsertSearchDocumentStep } from './steps/build-and-upsert-search-document'

type Input = { type: string; id: string }

const upsertSearchDocumentWorkflow = createWorkflow('upsert-search-document', function (input: Input) {
	const result = buildAndUpsertSearchDocumentStep(input)
	return new WorkflowResponse(result)
})

export default upsertSearchDocumentWorkflow
