import { definePolicies } from '../utils'
import { generateResourcePolicies } from '../utils'

/**
 * Operator-facing admin surfaces core ships without policy declarations of its
 * own: saved views, dashboard layouts, property labels, and the search index.
 * Declared here so `supplemental-route-policies.ts` has holdable grants to
 * reference — a route requiring an unregistered resource admits only wildcard
 * holders.
 *
 * `rbac_role` and `rbac_policy` cover core's own RBAC admin routes. They are
 * registered so those routes can be gated, not because this plugin builds on
 * core RBAC — nothing here imports or depends on it. Both are needed: the pinned
 * core map declares `/admin/rbac/roles*` and `/admin/rbac/policies*` separately,
 * and registering only one leaves the other's routes holdable by wildcard grants
 * alone. `reportUnregisteredGuardResources` exists to catch that class.
 */
const adminSurfaceResources = ['view', 'layout', 'property_label', 'search_index', 'rbac_role', 'rbac_policy']

export const adminSurfacePolicies = definePolicies(generateResourcePolicies(adminSurfaceResources))
