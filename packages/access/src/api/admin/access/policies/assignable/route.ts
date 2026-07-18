import { getAssignablePoliciesWorkflow } from "medusa-plugin-access/workflows"
import {
  AuthenticatedMedusaRequest,
  MedusaResponse,
} from "@medusajs/framework/http"

import { AdminGetAccessPoliciesParamsType } from "../validators"

/**
 * Returns the subset of `access_policy` rows the authenticated actor is allowed to assign.
 *
 * @ignore
 * @featureFlag rbac
 */
export const GET = async (
  req: AuthenticatedMedusaRequest<undefined, AdminGetAccessPoliciesParamsType>,
  res: MedusaResponse
) => {
  const { result } = await getAssignablePoliciesWorkflow(req.scope).run({
    input: {
      actor_id: req.auth_context.actor_id,
      actor: req.auth_context.actor_type,
      filters: req.filterableFields,
      pagination: req.queryConfig?.pagination,
    },
  })

  res.status(200).json(result)
}
