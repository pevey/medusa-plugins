import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { AdminCreateComplaintTagType, AdminDeleteComplaintTagsType, AdminGetComplaintTagsType } from '../../validators'
import { COMPLAINT_MODULE } from '../../../modules/complaint'
import { ComplaintService } from '../../../modules/complaint/service'

export async function GET(req: AuthenticatedMedusaRequest<AdminGetComplaintTagsType>, res: MedusaResponse) {
	const { q } = req.validatedQuery
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { data: complaintTags, metadata } = await query.graph({
		entity: 'complaint_tag',
		...req.queryConfig,
		filters: {
			...(q ? { value: { $ilike: `%${q}%` } } : {})
		}
	})
	res.json({
		complaint_tags: complaintTags,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateComplaintTagType>, res: MedusaResponse) => {
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	// `createComplaintTags` returns the raw ORM entity, which also carries the
	// unresolved `complaints` many-to-many Collection proxy. Destructure down to
	// AdminComplaintTag's fields so the create response matches
	// GET /admin/complaint-tags/:id's shape.
	const { id, value, created_at, updated_at } = await complaintService.createComplaintTags(req.validatedBody)
	res.json({ complaint_tag: { id, value, created_at, updated_at } })
}

export async function DELETE(req: AuthenticatedMedusaRequest<AdminDeleteComplaintTagsType>, res: MedusaResponse) {
	const complaintService: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
	const { ids } = req.validatedBody
	await complaintService.deleteComplaintTags(ids)
	res.json({ deleted: ids })
}
