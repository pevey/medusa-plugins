import { definePolicies } from '../utils'
import { generateResourcePolicies } from '../utils'

/**
 * Operator-facing admin surfaces core ships without policy declarations of its
 * own: saved views, dashboard layouts, property labels, and the search index.
 * Declared here so `supplemental-route-policies.ts` has holdable grants to
 * reference — a route requiring an unregistered resource admits only wildcard
 * holders.
 *
 * `rbac_role` covers core's own RBAC admin routes. It is registered so those
 * routes can be gated, not because this plugin builds on core RBAC — nothing
 * here imports or depends on it.
 */
const adminSurfaceResources = ['view', 'layout', 'property_label', 'search_index', 'rbac_role']

export const adminSurfacePolicies = definePolicies(generateResourcePolicies(adminSurfaceResources))
