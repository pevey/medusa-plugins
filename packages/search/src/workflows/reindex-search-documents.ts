import { createWorkflow, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { rebuildAllSearchDocumentsStep } from './steps/rebuild-all-search-documents'

const reindexSearchDocumentsWorkflow = createWorkflow('reindex-search-documents', function () {
	const counts = rebuildAllSearchDocumentsStep()
	return new WorkflowResponse({ counts })
})

export default reindexSearchDocumentsWorkflow
