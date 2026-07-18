import { createAccessPoliciesWorkflow } from "medusa-plugin-access/workflows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"
import { AdminCreateAccessPolicyType } from "./validators"

/**
 * @ignore
 * @featureFlag rbac
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  const { data: policies, metadata } = await query.graph({
    entity: "access_policy",
    fields: req.queryConfig.fields,
    filters: req.filterableFields,
    pagination: req.queryConfig.pagination,
  })

  res.status(200).json({
    policies,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}

/**
 * @ignore
 * @featureFlag rbac
 */
export const POST = async (
  req: AuthenticatedMedusaRequest<AdminCreateAccessPolicyType>,
  res: MedusaResponse
) => {
  const input = [req.validatedBody]

  const { result } = await createAccessPoliciesWorkflow(req.scope).run({
    input: { policies: input },
  })

  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
  const { data: policies } = await query.graph({
    entity: "access_policy",
    fields: req.queryConfig.fields,
    filters: { id: result[0].id },
  })

  const policy = policies[0]

  res.status(200).json({ policy })
}
