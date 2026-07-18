import {
  AuthenticatedMedusaRequest,
  MedusaNextFunction,
  MedusaResponse,
} from "@medusajs/framework/http"
import {
  ContainerRegistrationKeys,
  MedusaError,
} from "@medusajs/framework/utils"
import { AccessFieldFilter } from "./access-field-filter"
import { PermissionAction, hasPermission } from "./has-permission"
import { matchRoutePolicies } from "./route-guards"

/** Recursively delete a dotted field path from an object/array tree. */
function deletePath(node: any, segments: string[]): void {
  if (node == null || typeof node !== "object") {
    return
  }
  if (Array.isArray(node)) {
    for (const item of node) {
      deletePath(item, segments)
    }
    return
  }
  const [head, ...rest] = segments
  if (rest.length === 0) {
    delete node[head]
    return
  }
  deletePath(node[head], rest)
}

/**
 * Infer the response's entity key (e.g. `{ customer: … }` → "customer",
 * `{ customers: [], count }` → "customers"). `req.queryConfig.entity` is not
 * stored on the request, so we recover the entity from the response shape; the
 * joiner alias map resolves both singular and plural forms.
 */
function inferEntityKey(body: any): string | undefined {
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return undefined
  }
  const metaKeys = new Set(["count", "offset", "limit"])
  for (const key of Object.keys(body)) {
    if (metaKeys.has(key)) {
      continue
    }
    const value = body[key]
    if (value && typeof value === "object") {
      return key
    }
  }
  return undefined
}

/** Strip each not-allowed field path from every entity value in the response. */
function stripNotAllowedFields(body: any, notAllowed: string[]): void {
  if (!body || typeof body !== "object") {
    return
  }
  for (const key of Object.keys(body)) {
    const value = body[key]
    if (value && typeof value === "object") {
      for (const path of notAllowed) {
        deletePath(value, path.split("."))
      }
    }
  }
}

/**
 * Always-on response field-filter. Wraps `res.json`; when it fires,
 * `req.queryConfig` (entity + resolved fields) is populated, so we compute which
 * requested fields resolve to entities the actor cannot `read` and strip them
 * from the response. This closes the link-expansion bypass (e.g. reading
 * complaints via `customer.complaints` without `complaint:read`).
 *
 * Field-gating follows automatically from the policy definitions: the filter
 * only restricts entities registered as policy resources; undefined resources
 * are left untouched.
 */
function installFieldFilter(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  roleIds: string[],
  policies: PermissionAction[]
): void {
  const originalJson = res.json.bind(res)
  ;(res as any).json = (body: any) => {
    const queryConfig = (req as any).queryConfig
    const fields: string[] | undefined = queryConfig?.fields
    const entity: string | undefined =
      queryConfig?.entity ?? inferEntityKey(body)

    if (!entity || !fields?.length || res.headersSent) {
      return originalJson(body)
    }

    const filter = new AccessFieldFilter({
      // only used as a "should filter" flag (non-empty); actual checks use roles
      policies: policies as any,
      userRoles: roleIds,
      container: req.scope,
    })

    filter
      .getNotAllowedFields({
        entity,
        parsedFields: { fields: new Set(fields), starFields: new Set() },
      })
      .then((notAllowed) => {
        if (notAllowed.length) {
          stripNotAllowedFields(body, notAllowed)
        }
        originalJson(body)
      })
      .catch(() => {
        // fail-open: route-level enforcement still applied; a filter fault must
        // not brick the request.
        originalJson(body)
      })

    return res
  }
}

/**
 * Global `/admin/*` guard. Enforces route-level policies (resolving the actor's
 * roles from the `access_roles` link, not the JWT), then installs the response
 * field-filter. Active whenever the plugin is loaded (module presence is the
 * gate — no feature flag). Routes with no registered policies pass through.
 */
export async function accessGuard(
  req: AuthenticatedMedusaRequest,
  res: MedusaResponse,
  next: MedusaNextFunction
): Promise<void> {
  try {
    // The guard is mounted at `/admin/*`, so req.path is relative to the mount;
    // use the original URL (minus query string) for the full path.
    const fullPath = ((req as any).originalUrl ?? req.path).split("?")[0]
    const required = matchRoutePolicies(fullPath, req.method)
    if (!required.length) {
      return next()
    }

    const actorId = req.auth_context?.actor_id
    const actorType = req.auth_context?.actor_type

    if (!actorId) {
      throw new MedusaError(MedusaError.Types.FORBIDDEN, "Forbidden")
    }

    const query = req.scope.resolve(ContainerRegistrationKeys.QUERY)
    const { data: actors } = await query.graph({
      entity: actorType ?? "user",
      fields: ["access_roles.id"],
      filters: { id: actorId },
    })

    const roleIds: string[] =
      actors?.[0]?.access_roles?.map((r: any) => r.id).filter(Boolean) ?? []

    const allowed =
      roleIds.length > 0 &&
      (await hasPermission({
        roles: roleIds,
        actions: required,
        container: req.scope,
      }))

    if (!allowed) {
      throw new MedusaError(
        MedusaError.Types.FORBIDDEN,
        "Insufficient permissions"
      )
    }

    installFieldFilter(req, res, roleIds, required)

    return next()
  } catch (error) {
    return next(error)
  }
}
