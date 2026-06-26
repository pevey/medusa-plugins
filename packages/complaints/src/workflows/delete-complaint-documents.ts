import { Modules } from '@medusajs/framework/utils'
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'
import { COMPLAINT_MODULE } from '../modules/complaint'
import { ComplaintService } from '../modules/complaint/service'

// ── Types ──────────────────────────────────────────────────────────────────────

export type DeleteComplaintDocumentsInput = {
	ids: string[]
}

// ── Step ───────────────────────────────────────────────────────────────────────

export const deleteComplaintDocumentsStepId = 'delete-complaint-documents-step'

export const deleteComplaintDocumentsStep = createStep(
	deleteComplaintDocumentsStepId,
	async (input: DeleteComplaintDocumentsInput, { container }) => {
		if (!input.ids.length) {
			return new StepResponse({ deleted: [] as string[] })
		}

		const fileService = container.resolve(Modules.FILE)
		const provider = fileService.getProvider()
		const complaintService: ComplaintService = container.resolve(COMPLAINT_MODULE)

		// Look up file keys before deleting the rows.
		const documents = await complaintService.listComplaintDocuments(
			{ id: input.ids },
			{ select: ['id', 'file_key'] }
		)

		const fileKeys = documents.map((d) => d.file_key).filter(Boolean)

		// Delete R2 objects first. If this throws, the DB rows are left intact
		// so we still know what to clean up on a retry.
		if (fileKeys.length) {
			await provider.delete(
				fileKeys.map((fileKey) => ({ fileKey, access: 'private' }))
			)
		}

		await complaintService.deleteComplaintDocuments(input.ids)

		return new StepResponse({ deleted: input.ids })
	}
	// No compensation: a deleted R2 object cannot be restored. The DB delete
	// happens last, so a failure in the provider.delete call leaves rows in
	// place for a retry.
)

// ── Workflow ───────────────────────────────────────────────────────────────────

export const deleteComplaintDocumentsWorkflowId = 'delete-complaint-documents'

export const deleteComplaintDocumentsWorkflow = createWorkflow(
	deleteComplaintDocumentsWorkflowId,
	(input: DeleteComplaintDocumentsInput) => {
		return new WorkflowResponse(deleteComplaintDocumentsStep(input))
	}
)
