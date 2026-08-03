/**
 * Root entry for medusa-plugin-access.
 *
 * Re-exports the server-side policy + enforcement utilities so consumer
 * plugins and backends can pull the common API from the package root:
 *
 *   // in a plugin/backend src/api/middlewares.ts (Node / server-side):
 *   const { definePolicies, generateResourcePolicies, requirePolicies } =
 *     require("medusa-plugin-access")
 *
 * These are Node/server-side utilities — they write to the global policy and
 * route-guard registries and resolve services from the Medusa container, so do
 * NOT import them into admin widgets or other browser bundles. For UI, gate on
 * the `/admin/access/me/permissions` route instead.
 */
export * from './utils'
