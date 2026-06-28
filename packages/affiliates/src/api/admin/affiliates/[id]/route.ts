import { AuthenticatedMedusaRequest, MedusaResponse } from '@medusajs/framework/http'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { updateAffiliateWorkflow } from '../../../../workflows/update-affiliate'
import { updateAffiliateStatusWorkflow } from '../../../../workflows/update-affiliate-status'
import { deleteAffiliateWorkflow } from '../../../../workflows/delete-affiliate'
import { AdminUpdateAffiliateType } from '../../../validators'
import { AffiliateStatus } from '../../../../modules/affiliate/types'

export const GET = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
	const {
		data: [affiliate]
	} = await query.graph(
		{
			entity: 'affiliate',
			...req.queryConfig,
			filters: { id: req.params.id }
		},
		{ throwIfKeyNotFound: true }
	)
	if ((affiliate as any).deleted_at) {
		throw new MedusaError(MedusaError.Types.NOT_FOUND, `Affiliate ${req.params.id} not found`)
	}
	res.json({ affiliate })
}

export const POST = async (
	req: AuthenticatedMedusaRequest<AdminUpdateAffiliateType>,
	res: MedusaResponse
) => {
	const { status, ...rest } = req.validatedBody
	if (Object.keys(rest).length > 0) {
		await updateAffiliateWorkflow(req.scope).run({
			input: { id: req.params.id, ...rest }
		})
	}
	if (status) {
		await updateAffiliateStatusWorkflow(req.scope).run({
			input: { id: req.params.id, status: status as AffiliateStatus }
		})
	}
	res.json({ id: req.params.id })
}

export const DELETE = async (req: AuthenticatedMedusaRequest, res: MedusaResponse) => {
	await deleteAffiliateWorkflow(req.scope).run({ input: { id: req.params.id } })
	res.json({ id: req.params.id, deleted: true })
}
