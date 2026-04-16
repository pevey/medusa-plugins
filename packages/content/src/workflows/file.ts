import { FileTypes } from '@medusajs/framework/types'
import { Modules } from '@medusajs/framework/utils'
import {
	createStep,
	createWorkflow,
	StepResponse,
	WorkflowResponse
} from '@medusajs/framework/workflows-sdk'

// ── Types ──────────────────────────────────────────────────────────────────────

export type UploadFilesWithPrefixInput = {
	files: (FileTypes.ProviderUploadFileDTO & {
		/**
		 * Optional storage key prefix, forwarded to the file provider's upload()
		 * method. For example, pass "blog/" to store the file under blog/{filename}.
		 */
		prefix?: string
	})[]
}

// ── Step ───────────────────────────────────────────────────────────────────────

export const uploadFilesWithPrefixStepId = 'upload-files-with-prefix'

export const uploadFilesWithPrefixStep = createStep(
	uploadFilesWithPrefixStepId,
	async (data: UploadFilesWithPrefixInput, { container }) => {
		const service = container.resolve(Modules.FILE)
		const provider = service.getProvider()

		const created = await Promise.all(
			data.files.map(({ prefix, ...file }) =>
				provider.upload({ ...file, prefix: prefix ?? '' } as FileTypes.ProviderUploadFileDTO)
			)
		)

		return new StepResponse(created, created.map((file) => file.key))
	},
	async (fileKeys: string[] | undefined, { container }) => {
		if (!fileKeys?.length) {
			return
		}
		const service = container.resolve(Modules.FILE)
		const provider = service.getProvider()
		await provider.delete(fileKeys.map((fileKey) => ({ fileKey, access: 'public' })))
	}
)

// ── Workflow ───────────────────────────────────────────────────────────────────

export const uploadFilesWithPrefixWorkflowId = 'upload-files-with-prefix'

export const uploadFilesWithPrefixWorkflow = createWorkflow(
	uploadFilesWithPrefixWorkflowId,
	(input: UploadFilesWithPrefixInput) => {
		return new WorkflowResponse(uploadFilesWithPrefixStep(input))
	}
)
