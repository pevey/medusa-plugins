import { ContainerRegistrationKeys, Modules } from '@medusajs/framework/utils'
import { createStep, createWorkflow, StepResponse, transform } from '@medusajs/framework/workflows-sdk'
import { notifyOnFailureStep, sendNotificationsStep, useQueryGraphStep } from '@medusajs/core-flows'
import { buildComplaintsPdf } from './generate-complaints-pdf-export/build'
import { fetchDocumentBytes } from './generate-complaints-pdf-export/fetch-bytes'
import { loadComplaintsForExport } from './generate-complaints-pdf-export/load'

export type GenerateComplaintsPdfExportInput = {
	complaint_ids: string[]
	requested_by: string | null
}

type RollbackData = { fileKey: string } | undefined

const generateComplaintsPdfExportStepId = 'generate-complaints-pdf-export-step'

const generateComplaintsPdfExportStep = createStep(
	generateComplaintsPdfExportStepId,
	async (input: GenerateComplaintsPdfExportInput, { container }) => {
		const locking = container.resolve(Modules.LOCKING)
		const result = await locking.execute(
			'complaint-pdf-export:singleton',
			async () => {
				const query = container.resolve(ContainerRegistrationKeys.QUERY)
				const fileSvc = container.resolve(Modules.FILE)
				const provider = (fileSvc as any).getProvider()

				const complaints = await loadComplaintsForExport(query as any, input.complaint_ids)
				const docBytes = await fetchDocumentBytes(provider, complaints)
				const pdfBytes = await buildComplaintsPdf({ complaints, docBytes })

				const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
				const filename = `complaints-export-${timestamp}.pdf`
				const upload = await (fileSvc as any).getUploadStream({
					filename,
					mimeType: 'application/pdf',
					access: 'private'
				})
				upload.writeStream.end(Buffer.from(pdfBytes))
				await upload.promise

				return { fileKey: upload.fileKey as string, filename }
			},
			{ timeout: 60 * 60 }
		)
		return new StepResponse(result, { fileKey: result.fileKey })
	},
	async (rollback: RollbackData, { container }) => {
		if (!rollback) return
		const fileSvc = container.resolve(Modules.FILE)
		await (fileSvc as any).deleteFiles(rollback.fileKey)
	}
)

export const generateComplaintsPdfExportWorkflowId = 'generate-complaints-pdf-export'

export const generateComplaintsPdfExportWorkflow = createWorkflow(generateComplaintsPdfExportWorkflowId, (input: GenerateComplaintsPdfExportInput) => {
	const file = generateComplaintsPdfExportStep(input).config({
		async: true,
		backgroundExecution: true
	})

	const failureNotification = transform({ input }, () => [
		{
			to: '',
			channel: 'feed',
			template: 'admin-ui',
			data: {
				title: 'Complaints PDF export',
				description: 'Failed to generate PDF — please try again.'
			}
		}
	])
	notifyOnFailureStep(failureNotification)

	const { data: fileDetails } = useQueryGraphStep({
		entity: 'file',
		fields: ['id', 'url'],
		filters: { id: file.fileKey },
		options: { isList: false }
	})

	const notifications = transform({ fileDetails, file }, data => [
		{
			to: '',
			channel: 'feed',
			template: 'admin-ui',
			data: {
				title: 'Complaints PDF export',
				description: 'Your complaints PDF is ready.',
				file: {
					filename: (data.file as any).filename,
					url: (data.fileDetails as any).url,
					mimeType: 'application/pdf'
				}
			}
		}
	])
	sendNotificationsStep(notifications)
})
