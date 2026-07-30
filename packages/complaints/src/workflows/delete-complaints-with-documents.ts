import { Modules } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { COMPLAINT_MODULE } from '../modules/complaint'
import { ComplaintService } from '../modules/complaint/service'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DeleteComplaintsWithDocumentsInput = {
	ids: string[]
}

// ── Step ───────────────────────────────────────────────────────────────────────

export const deleteComplaintsWithDocumentsStepId = 'delete-complaints-with-documents-step'

export const deleteComplaintsWithDocumentsStep = createStep(
	deleteComplaintsWithDocumentsStepId,
	async (input: DeleteComplaintsWithDocumentsInput, { container }) => {
		if (!input.ids.length) {
			return new StepResponse({ deleted: [] as string[] })
		}

		const fileService = container.resolve(Modules.FILE)
		const provider = fileService.getProvider()
		const complaintService: ComplaintService = container.resolve(COMPLAINT_MODULE)

		// Fetch all documents attached to the complaints being deleted, so we
		// can purge their R2 objects before the DB cascade drops the rows.
		const documents = await complaintService.listComplaintDocuments({ complaint_id: input.ids }, { select: ['id', 'file_key'] })

		const fileKeys = documents.map(d => d.file_key).filter(Boolean)

		if (fileKeys.length) {
			await provider.delete(fileKeys.map(fileKey => ({ fileKey, access: 'private' })))
		}

		if (documents.length) {
			await complaintService.deleteComplaintDocuments(documents.map(d => d.id))
		}

		await complaintService.deleteComplaints(input.ids)

		return new StepResponse({ deleted: input.ids })
	}
	// No compensation: R2 deletes are forward-only.
)

// ── Workflow ───────────────────────────────────────────────────────────────────

export const deleteComplaintsWithDocumentsWorkflowId = 'delete-complaints-with-documents'

export const deleteComplaintsWithDocumentsWorkflow = createWorkflow(deleteComplaintsWithDocumentsWorkflowId, (input: DeleteComplaintsWithDocumentsInput) => {
	return new WorkflowResponse(deleteComplaintsWithDocumentsStep(input))
})
