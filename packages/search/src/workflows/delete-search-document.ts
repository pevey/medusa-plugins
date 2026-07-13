import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { deleteSearchDocumentStep } from './steps/delete-search-document'

type Input = { type: string; id: string }

const deleteSearchDocumentWorkflow = createWorkflow('delete-search-document', function (input: Input) {
	const result = deleteSearchDocumentStep(input)
	return new WorkflowResponse(result)
})

export default deleteSearchDocumentWorkflow
