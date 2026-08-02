/**
 * Response contracts for the access (RBAC) admin API.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the hand-written
 * admin view types in `../../src/admin/types`. Nothing previously verified those
 * hand-written types actually matched what the routes return -- the admin dashboard
 * is bundled by Vite and never typechecked against a real HTTP response, and the
 * test harness fakes the SDK, so it only ever sees fixtures a test author wrote.
 * This module plus the `.parse()` calls in `access.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-access typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in access.spec.ts. A route that
 *                           stops returning a field, or starts returning an extra
 *                           one, fails the parse -- `z.strictObject` rejects unknown
 *                           keys, so both directions are caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not part of
 *                           this file; access has no `tsconfig.admin.json` yet -- see
 *                           task-4c-access-report.md).
 *
 * A route changing shape fails link 2; "fixing" the schema to match would silently
 * break link 3 for every component reading the removed/changed field, so schema
 * drift is a finding about the TYPE (and by extension the components that read it),
 * never a reason to loosen the schema. See task-4c-access-report.md for every
 * mismatch found while building this file and which side was fixed -- several of
 * them are real, currently-shipping bugs (a role-permissions badge that would
 * crash on render, an admin route over-exposing raw user records), not just
 * typing nits.
 *
 * Unlike complaints (the pilot for this pattern), access's own admin types never
 * embed a raw core-Medusa DTO (`AdminUser`, `AdminCustomer`, ...) directly -- every
 * embedded "foreign" entity (a role's users, a policy's roles) is already a
 * plugin-authored, explicitly field-selected projection (`AdminAccessRoleUser`,
 * `{ id: string }`), not the real `AdminUser` type. So the `CoreEntityRef` +
 * `as unknown as z.ZodType<...>` cast used in complaints for genuinely-Medusa
 * fields is not needed anywhere in this file -- see the note on
 * `AdminAccessRoleUserSchema` below for the one place it would have applied
 * before a route fix removed the need for it.
 */
import { z } from '@medusajs/framework/zod'
import type {
	AdminAccessMePermissionsResponse,
	AdminAccessPolicy,
	AdminAccessPolicyResponse,
	AdminAccessPolicyRole,
	AdminAccessPolicyRolesResponse,
	AdminAccessPoliciesResponse,
	AdminAccessRole,
	AdminAccessRoleResponse,
	AdminAccessRolePolicy,
	AdminAccessRolePoliciesResponse,
	AdminAccessRoleUser,
	AdminAccessRoleUsersResponse,
	AdminAccessRolesResponse,
	AdminAddRolePoliciesResponse,
	AdminAssignRoleUsersResponse,
	AdminAssignUserRolesResponse
} from '../../src/admin/types'

// ── Access roles ─────────────────────────────────────────────────────────────

// NOTE: no `parent_id` here -- see the note on `AdminAccessRole` in
// `src/admin/types.ts` (role hierarchy is a many-to-many join, not a scalar FK;
// the field never appears in any response). `deleted_at` IS modelled, required
// and nullable: every route that returns an `AdminAccessRole` includes it by
// default (a type↔route mismatch found and fixed while building this file --
// see the report).
export const AdminAccessRoleSchema = z.strictObject({
	id: z.string(),
	name: z.string(),
	description: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	deleted_at: z.string().nullable()
})
const _roleSchemaMatchesType: AdminAccessRole = {} as z.infer<typeof AdminAccessRoleSchema>
const _roleTypeMatchesSchema: z.infer<typeof AdminAccessRoleSchema> = {} as AdminAccessRole

export const AdminAccessRoleResponseSchema = z.strictObject({
	role: AdminAccessRoleSchema
})
const _roleResponseSchemaMatchesType: AdminAccessRoleResponse = {} as z.infer<typeof AdminAccessRoleResponseSchema>
const _roleResponseTypeMatchesSchema: z.infer<typeof AdminAccessRoleResponseSchema> = {} as AdminAccessRoleResponse

export const AdminAccessRolesResponseSchema = z.strictObject({
	roles: z.array(AdminAccessRoleSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number()
})
const _rolesResponseSchemaMatchesType: AdminAccessRolesResponse = {} as z.infer<typeof AdminAccessRolesResponseSchema>
const _rolesResponseTypeMatchesSchema: z.infer<typeof AdminAccessRolesResponseSchema> = {} as AdminAccessRolesResponse

// POST /admin/users/:id/access/roles (assign) -- same row shape as the list
// above, but no pagination envelope: the route returns the user's full current
// role set, not a page of it.
export const AdminAssignUserRolesResponseSchema = z.strictObject({
	roles: z.array(AdminAccessRoleSchema)
})
const _assignUserRolesSchemaMatchesType: AdminAssignUserRolesResponse = {} as z.infer<typeof AdminAssignUserRolesResponseSchema>
const _assignUserRolesTypeMatchesSchema: z.infer<typeof AdminAssignUserRolesResponseSchema> = {} as AdminAssignUserRolesResponse

// ── Access policies ──────────────────────────────────────────────────────────

export const AdminAccessPolicySchema = z.strictObject({
	id: z.string(),
	key: z.string(),
	resource: z.string(),
	operation: z.string(),
	name: z.string().nullable().optional(),
	description: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string(),
	updated_at: z.string(),
	deleted_at: z.string().nullable()
})
const _policySchemaMatchesType: AdminAccessPolicy = {} as z.infer<typeof AdminAccessPolicySchema>
const _policyTypeMatchesSchema: z.infer<typeof AdminAccessPolicySchema> = {} as AdminAccessPolicy

export const AdminAccessPolicyResponseSchema = z.strictObject({
	policy: AdminAccessPolicySchema
})
const _policyResponseSchemaMatchesType: AdminAccessPolicyResponse = {} as z.infer<typeof AdminAccessPolicyResponseSchema>
const _policyResponseTypeMatchesSchema: z.infer<typeof AdminAccessPolicyResponseSchema> = {} as AdminAccessPolicyResponse

export const AdminAccessPoliciesResponseSchema = z.strictObject({
	policies: z.array(AdminAccessPolicySchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number()
})
const _policiesResponseSchemaMatchesType: AdminAccessPoliciesResponse = {} as z.infer<typeof AdminAccessPoliciesResponseSchema>
const _policiesResponseTypeMatchesSchema: z.infer<typeof AdminAccessPoliciesResponseSchema> = {} as AdminAccessPoliciesResponse

// ── Role <-> policy links ────────────────────────────────────────────────────

// `policy` is the permission-key string (e.g. "product:read"), NOT the nested
// `access_role_policy.policy` relation object it would naively resolve to --
// see the note in `roles/[id]/policies/route.ts` (a route-side flatten fixes
// this; found via a real Jest failure -- `policy` came back as `{ id }`, which
// the role detail page renders directly as `{p.policy}`, a React
// "objects are not valid as a child" crash waiting to happen).
// `metadata`/`created_at`/`updated_at`/`deleted_at` are real columns, present
// under the query-config defaults and absent when a caller (e.g. this plugin's
// own `useAccessRolePolicies` hook) explicitly narrows `fields=`.
export const AdminAccessRolePolicySchema = z.strictObject({
	id: z.string(),
	role_id: z.string(),
	policy_id: z.string(),
	policy: z.string(),
	scope: z.string().nullable().optional(),
	metadata: z.record(z.string(), z.unknown()).nullable().optional(),
	created_at: z.string().optional(),
	updated_at: z.string().optional(),
	deleted_at: z.string().nullable().optional()
})
const _rolePolicySchemaMatchesType: AdminAccessRolePolicy = {} as z.infer<typeof AdminAccessRolePolicySchema>
const _rolePolicyTypeMatchesSchema: z.infer<typeof AdminAccessRolePolicySchema> = {} as AdminAccessRolePolicy

export const AdminAccessRolePoliciesResponseSchema = z.strictObject({
	policies: z.array(AdminAccessRolePolicySchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number()
})
const _rolePoliciesResponseSchemaMatchesType: AdminAccessRolePoliciesResponse = {} as z.infer<typeof AdminAccessRolePoliciesResponseSchema>
const _rolePoliciesResponseTypeMatchesSchema: z.infer<typeof AdminAccessRolePoliciesResponseSchema> = {} as AdminAccessRolePoliciesResponse

// POST /admin/access/roles/:id/policies (attach) -- no pagination envelope:
// the route returns exactly the rows it just created.
export const AdminAddRolePoliciesResponseSchema = z.strictObject({
	policies: z.array(AdminAccessRolePolicySchema)
})
const _addRolePoliciesSchemaMatchesType: AdminAddRolePoliciesResponse = {} as z.infer<typeof AdminAddRolePoliciesResponseSchema>
const _addRolePoliciesTypeMatchesSchema: z.infer<typeof AdminAddRolePoliciesResponseSchema> = {} as AdminAddRolePoliciesResponse

// ── Role <-> user links ──────────────────────────────────────────────────────

// AdminUser IS a core-Medusa entity, but unlike complaints' embedded
// AdminCustomer/AdminOrder/AdminProduct, this plugin never returns the raw
// entity here: `defaultAdminRoleUsersFields` (and the matching POST handler)
// explicitly select `user.id,user.email,user.first_name,user.last_name` --
// fixed in this pass away from a `user.*` wildcard that leaked the full raw
// User row (avatar_url, metadata, created_at, updated_at, deleted_at) through
// a permissions-management endpoint (see the report -- flagged as
// security-relevant over-exposure, not just a shape nit). Because the route
// now returns exactly this plugin-controlled projection rather than the real
// `AdminUser`, there is no index-signature trap to work around: this schema
// models the four fields directly against `AdminAccessRoleUser` with no
// `CoreEntityRef`/`.passthrough()`/cast needed, and gets full runtime
// verification of every field the UI actually reads (email, first_name,
// last_name) that a passthrough model would have skipped.
export const AdminAccessRoleUserSchema = z.strictObject({
	id: z.string(),
	email: z.string(),
	first_name: z.string().nullable().optional(),
	last_name: z.string().nullable().optional()
})
const _roleUserSchemaMatchesType: AdminAccessRoleUser = {} as z.infer<typeof AdminAccessRoleUserSchema>
const _roleUserTypeMatchesSchema: z.infer<typeof AdminAccessRoleUserSchema> = {} as AdminAccessRoleUser

export const AdminAccessRoleUsersResponseSchema = z.strictObject({
	users: z.array(AdminAccessRoleUserSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number()
})
const _roleUsersResponseSchemaMatchesType: AdminAccessRoleUsersResponse = {} as z.infer<typeof AdminAccessRoleUsersResponseSchema>
const _roleUsersResponseTypeMatchesSchema: z.infer<typeof AdminAccessRoleUsersResponseSchema> = {} as AdminAccessRoleUsersResponse

// POST /admin/access/roles/:id/users (assign) -- no pagination envelope: the
// route returns the role's full current user set.
export const AdminAssignRoleUsersResponseSchema = z.strictObject({
	users: z.array(AdminAccessRoleUserSchema)
})
const _assignRoleUsersSchemaMatchesType: AdminAssignRoleUsersResponse = {} as z.infer<typeof AdminAssignRoleUsersResponseSchema>
const _assignRoleUsersTypeMatchesSchema: z.infer<typeof AdminAssignRoleUsersResponseSchema> = {} as AdminAssignRoleUsersResponse

// ── Policy <-> role links ────────────────────────────────────────────────────

// GET /admin/access/policies/:id/roles. `role.*` fields are explicitly
// selected (not a wildcard), so this is `AdminAccessRole` plus an optional
// `users` sub-relation of bare `{ id }` refs -- a plugin-local anonymous shape,
// not a core entity, so no CoreEntityRef treatment applies here either.
export const AdminAccessPolicyRoleSchema = AdminAccessRoleSchema.extend({
	users: z.array(z.strictObject({ id: z.string() })).optional()
})
const _policyRoleSchemaMatchesType: AdminAccessPolicyRole = {} as z.infer<typeof AdminAccessPolicyRoleSchema>
const _policyRoleTypeMatchesSchema: z.infer<typeof AdminAccessPolicyRoleSchema> = {} as AdminAccessPolicyRole

export const AdminAccessPolicyRolesResponseSchema = z.strictObject({
	roles: z.array(AdminAccessPolicyRoleSchema),
	count: z.number(),
	offset: z.number(),
	limit: z.number()
})
const _policyRolesResponseSchemaMatchesType: AdminAccessPolicyRolesResponse = {} as z.infer<typeof AdminAccessPolicyRolesResponseSchema>
const _policyRolesResponseTypeMatchesSchema: z.infer<typeof AdminAccessPolicyRolesResponseSchema> = {} as AdminAccessPolicyRolesResponse

// ── Effective permissions ────────────────────────────────────────────────────

// GET /admin/access/me/permissions. Consumed by OTHER plugins' admin widgets
// to detect whether access is installed and read the caller's effective
// permission set -- a cross-plugin contract, not just an internal one, so its
// shape is covered here even though it has no list/detail counterpart.
export const AdminAccessMePermissionsResponseSchema = z.strictObject({
	permissions: z.array(z.string()),
	scoped: z.array(z.object({ resource: z.string(), operation: z.string(), scope: z.string() }))
})
const _mePermissionsSchemaMatchesType: AdminAccessMePermissionsResponse = {} as z.infer<typeof AdminAccessMePermissionsResponseSchema>
const _mePermissionsTypeMatchesSchema: z.infer<typeof AdminAccessMePermissionsResponseSchema> = {} as AdminAccessMePermissionsResponse
