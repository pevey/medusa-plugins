import { FileTypes } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, WorkflowResponse } from '@medusajs/framework/workflows-sdk'
import { COMPLAINT_MODULE } from '../modules/complaint'
import { ComplaintService } from '../modules/complaint/service'

// ── Types ──────────────────────────────────────────────────────────────────────

export type UploadComplaintDocumentsInput = {
	complaint_id: string
	uploaded_by: string | null
	files: Array<{
		filename: string
		mimeType: string
		content: string // base64
		size_bytes: number
	}>
}

type RollbackData =
	| {
			documentIds: string[]
			fileKeys: string[]
	  }
	| undefined

// ── Step ───────────────────────────────────────────────────────────────────────

export const uploadComplaintDocumentsStepId = 'upload-complaint-documents-step'

export const uploadComplaintDocumentsStep = createStep(
	uploadComplaintDocumentsStepId,
	async (input: UploadComplaintDocumentsInput, { container }) => {
		const fileService = container.resolve(Modules.FILE)
		const provider = fileService.getProvider()
		const complaintService: ComplaintService = container.resolve(COMPLAINT_MODULE)

		const prefix = `complaints/${input.complaint_id}/`

		// 1) Upload each file to the configured provider as private.
		const uploaded = await Promise.all(
			input.files.map(file =>
				provider.upload({
					filename: file.filename,
					mimeType: file.mimeType,
					content: file.content,
					access: 'private',
					prefix
				} as FileTypes.ProviderUploadFileDTO & { prefix?: string })
			)
		)

		// 2) Persist a ComplaintDocument row per uploaded file.
		// If this fails, the catch below removes the uploaded R2 objects so we
		// never end up with orphaned files in private storage.
		try {
			const created = await complaintService.createComplaintDocuments(
				uploaded.map((up, i) => ({
					complaint_id: input.complaint_id,
					file_key: up.key,
					filename: input.files[i].filename,
					mime_type: input.files[i].mimeType,
					size_bytes: input.files[i].size_bytes,
					uploaded_by: input.uploaded_by
				}))
			)
			const documents = Array.isArray(created) ? created : [created]

			const rollback: RollbackData = {
				documentIds: documents.map(d => d.id),
				fileKeys: uploaded.map(u => u.key)
			}

			return new StepResponse(documents, rollback)
		} catch (err) {
			await provider.delete(uploaded.map(u => ({ fileKey: u.key, access: 'private' })))
			throw err
		}
	},
	async (rollback: RollbackData, { container }) => {
		if (!rollback) return
		const fileService = container.resolve(Modules.FILE)
		const provider = fileService.getProvider()
		const complaintService: ComplaintService = container.resolve(COMPLAINT_MODULE)

		if (rollback.documentIds.length) {
			await complaintService.deleteComplaintDocuments(rollback.documentIds)
		}
		if (rollback.fileKeys.length) {
			await provider.delete(rollback.fileKeys.map(fileKey => ({ fileKey, access: 'private' })))
		}
	}
)

// ── Workflow ───────────────────────────────────────────────────────────────────

export const uploadComplaintDocumentsWorkflowId = 'upload-complaint-documents'

export const uploadComplaintDocumentsWorkflow = createWorkflow(uploadComplaintDocumentsWorkflowId, (input: UploadComplaintDocumentsInput) => {
	return new WorkflowResponse(uploadComplaintDocumentsStep(input))
})
