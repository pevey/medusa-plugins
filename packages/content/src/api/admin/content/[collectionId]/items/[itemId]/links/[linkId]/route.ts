import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework'
import { CONTENT_MODULE } from '../../../../../../../../modules/content'
import { ContentService } from '../../../../../../../../modules/content/service'

export const DELETE = async (
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
) => {
	const { linkId } = req.params
	const contentService: ContentService = req.scope.resolve(CONTENT_MODULE)
	await contentService.deleteContentLinks([linkId])
	res.json({ deleted: [linkId] })
}
