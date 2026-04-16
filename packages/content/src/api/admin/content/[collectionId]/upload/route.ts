import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { MedusaError } from '@medusajs/framework/utils'
import { uploadFilesWithPrefixWorkflow } from '../../../../../workflows/file'
import { CONTENT_MODULE } from '../../../../../modules/content'
import { ContentService } from '../../../../../modules/content/service'

interface MulterFile {
	originalname: string
	mimetype: string
	buffer: Buffer
}

export const POST = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const files = req.files as MulterFile[] | undefined
	if (!files?.length) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, 'No files were uploaded')
	}

	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	const contentCollection = await contentService.retrieveContentCollection(req.params.collectionId, {
		select: ['id', 'prefix']
	})

	const prefix = contentCollection.prefix ?? ''

	const { result } = await uploadFilesWithPrefixWorkflow(req.scope).run({
		input: {
			files: files.map(f => ({
				filename: f.originalname,
				mimeType: f.mimetype,
				content: f.buffer.toString('base64'),
				access: 'public' as const,
				prefix
			}))
		}
	})

	res.status(200).json({ files: result })
}
