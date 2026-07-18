import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
} from "@medusajs/framework/utils"


/**
 * Lists the roles that include the given policy.
 *
 * @ignore
 * @featureFlag rbac
 */
export const GET = async (
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse
) => {
  const policyId = req.params.id
  const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)

  await query.graph(
    {
      entity: "access_policy",
      fields: ["id"],
      filters: { id: policyId },
    },
    {
      throwIfKeyNotFound: true,
    }
  )

  const { data: links, metadata } = await query.graph({
    entity: "access_role_policy",
    fields: req.queryConfig.fields,
    filters: { policy_id: policyId },
    pagination: req.queryConfig.pagination,
  })

  const roles = links
    .map((link: any) => link.role)
    .filter((role: any) => !!role)

  res.status(200).json({
    roles,
    count: metadata?.count ?? 0,
    offset: metadata?.skip ?? 0,
    limit: metadata?.take ?? 0,
  })
}
