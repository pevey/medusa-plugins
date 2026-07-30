import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createAffiliateWorkflow } from '../../../workflows/create-affiliate'
import { deleteAffiliateWorkflow } from '../../../workflows/delete-affiliate'
import { AdminCreateAffiliateType, AdminDeleteAffiliatesType, AdminListAffiliatesType } from '../../validators'

export const GET = async (req: AuthenticatedMedusaRequest<AdminListAffiliatesType>, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const { q, status } = req.validatedQuery

	const filters: Record<string, unknown> = {}
	if (status) filters.status = status
	if (q) {
		filters.$or = [{ name: { $ilike: `%${q}%` } }, { email: { $ilike: `%${q}%` } }]
	}

	const { data: affiliates, metadata } = await query.graph({
		entity: 'affiliate',
		...req.queryConfig,
		filters
	})

	const activeAffiliates = affiliates.filter((a: any) => !a.deleted_at)

	res.json({
		affiliates: activeAffiliates,
		count: metadata?.count,
		limit: metadata?.take,
		offset: metadata?.skip
	})
}

export const POST = async (req: AuthenticatedMedusaRequest<AdminCreateAffiliateType>, res: MedusaResponse) => {
	const { result } = await createAffiliateWorkflow(req.scope).run({
		input: req.validatedBody
	})
	res.json({ affiliate: result })
}

export const DELETE = async (req: AuthenticatedMedusaRequest<AdminDeleteAffiliatesType>, res: MedusaResponse) => {
	const { ids } = req.validatedBody
	for (const id of ids) {
		await deleteAffiliateWorkflow(req.scope).run({ input: { id } })
	}
	res.json({ deleted: ids })
}
