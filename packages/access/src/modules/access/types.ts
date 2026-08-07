// Vendored from @medusajs/types rbac types, renamed rbac -> access.
// Generic framework types are imported from @medusajs/framework/types.
import { Context, FindConfig, IModuleService, RestoreReturn, SoftDeleteReturn } from '@medusajs/framework/types'
import type { AccessNamespaceOptions } from '../../utils/access-namespace'

/**
 * Options accepted by the access plugin in `medusa-config.ts` (plugin options
 * flow through to the module).
 */
export type AccessModuleOptions = {
	/** Configuration for the top-level `/access` introspection namespace. */
	accessNamespace?: AccessNamespaceOptions
}

export type AccessRoleDTO = {
	id: string
	name: string
	description?: string | null
	metadata?: Record<string, unknown> | null
	policies?: AccessPolicyDTO[]
	deleted_at?: Date | string | null
}

export type FilterableAccessRoleProps = {
	id?: string | string[]
	name?: string
	q?: string
}

export type AccessPolicyDTO = {
	id: string
	key: string
	resource: string
	operation: string
	name?: string | null
	description?: string | null
	metadata?: Record<string, unknown> | null
	deleted_at?: Date | string | null
}

export type FilterableAccessPolicyProps = {
	id?: string | string[]
	key?: string | string[]
	resource?: string
	operation?: string
	q?: string
}

export type AccessRolePolicyDTO = {
	id: string
	role_id: string
	policy_id: string
	scope?: string | null
	metadata?: Record<string, unknown> | null
	deleted_at?: Date | string | null
}

export type FilterableAccessRolePolicyProps = {
	id?: string | string[]
	role_id?: string | string[]
	policy_id?: string | string[]
}

export type AccessRoleParentDTO = {
	id: string
	role_id: string
	parent_id: string
	metadata?: Record<string, unknown> | null
}

export type FilterableAccessRoleParentProps = {
	id?: string | string[]
	role_id?: string | string[]
	parent_id?: string | string[]
}
export type CreateAccessRoleDTO = {
	name: string
	description?: string | null
	metadata?: Record<string, unknown> | null
}

export type UpdateAccessRoleDTO = Partial<CreateAccessRoleDTO> & {
	id: string
}

export type CreateAccessPolicyDTO = {
	key: string
	resource: string
	operation: string
	name?: string | null
	description?: string | null
	metadata?: Record<string, unknown> | null
}

export type UpdateAccessPolicyDTO = Partial<CreateAccessPolicyDTO> & {
	id: string
}

export type CreateAccessRolePolicyDTO = {
	role_id: string
	policy_id: string
	scope?: string | null
	metadata?: Record<string, unknown> | null
}

export type UpdateAccessRolePolicyDTO = Partial<CreateAccessRolePolicyDTO> & {
	id: string
}

export type CreateAccessRoleParentDTO = {
	role_id: string
	parent_id: string
	metadata?: Record<string, unknown> | null
}

export type UpdateAccessRoleParentDTO = Partial<CreateAccessRoleParentDTO> & {
	id: string
}

export type AccessRoleAssignmentDTO = {
	id: string
	role_id: string
	grantee_type: string
	grantee_id: string
	scope_type?: string | null
	scope_id?: string | null
	metadata?: Record<string, unknown> | null
	deleted_at?: Date | string | null
}

export type FilterableAccessRoleAssignmentProps = {
	id?: string | string[]
	role_id?: string | string[]
	grantee_type?: string | string[]
	grantee_id?: string | string[]
	scope_type?: string | string[] | null
	scope_id?: string | string[] | null
}

export type CreateAccessRoleAssignmentDTO = {
	role_id: string
	grantee_type: string
	grantee_id: string
	scope_type?: string | null
	scope_id?: string | null
	metadata?: Record<string, unknown> | null
}

export type UpdateAccessRoleAssignmentDTO = Partial<CreateAccessRoleAssignmentDTO> & {
	id: string
}
export interface IAccessModuleService extends IModuleService {
	createAccessRoles(data: CreateAccessRoleDTO, sharedContext?: Context): Promise<AccessRoleDTO>
	createAccessRoles(data: CreateAccessRoleDTO[], sharedContext?: Context): Promise<AccessRoleDTO[]>

	updateAccessRoles(data: UpdateAccessRoleDTO, sharedContext?: Context): Promise<AccessRoleDTO>
	updateAccessRoles(data: UpdateAccessRoleDTO[], sharedContext?: Context): Promise<AccessRoleDTO[]>

	deleteAccessRoles(ids: string | string[], sharedContext?: Context): Promise<void>

	retrieveAccessRole(id: string, config?: FindConfig<AccessRoleDTO>, sharedContext?: Context): Promise<AccessRoleDTO>

	listAccessRoles(filters?: FilterableAccessRoleProps, config?: FindConfig<AccessRoleDTO>, sharedContext?: Context): Promise<AccessRoleDTO[]>

	listAndCountAccessRoles(filters?: FilterableAccessRoleProps, config?: FindConfig<AccessRoleDTO>, sharedContext?: Context): Promise<[AccessRoleDTO[], number]>

	createAccessPolicies(data: CreateAccessPolicyDTO, sharedContext?: Context): Promise<AccessPolicyDTO>
	createAccessPolicies(data: CreateAccessPolicyDTO[], sharedContext?: Context): Promise<AccessPolicyDTO[]>

	updateAccessPolicies(data: UpdateAccessPolicyDTO, sharedContext?: Context): Promise<AccessPolicyDTO>
	updateAccessPolicies(data: UpdateAccessPolicyDTO[], sharedContext?: Context): Promise<AccessPolicyDTO[]>

	deleteAccessPolicies(ids: string | string[], sharedContext?: Context): Promise<void>

	retrieveAccessPolicy(id: string, config?: FindConfig<AccessPolicyDTO>, sharedContext?: Context): Promise<AccessPolicyDTO>

	listAccessPolicies(filters?: FilterableAccessPolicyProps, config?: FindConfig<AccessPolicyDTO>, sharedContext?: Context): Promise<AccessPolicyDTO[]>

	listAndCountAccessPolicies(
		filters?: FilterableAccessPolicyProps,
		config?: FindConfig<AccessPolicyDTO>,
		sharedContext?: Context
	): Promise<[AccessPolicyDTO[], number]>

	createAccessRolePolicies(data: CreateAccessRolePolicyDTO, sharedContext?: Context): Promise<AccessRolePolicyDTO>
	createAccessRolePolicies(data: CreateAccessRolePolicyDTO[], sharedContext?: Context): Promise<AccessRolePolicyDTO[]>

	updateAccessRolePolicies(data: UpdateAccessRolePolicyDTO, sharedContext?: Context): Promise<AccessRolePolicyDTO>
	updateAccessRolePolicies(data: UpdateAccessRolePolicyDTO[], sharedContext?: Context): Promise<AccessRolePolicyDTO[]>

	deleteAccessRolePolicies(ids: string | string[], sharedContext?: Context): Promise<void>

	retrieveAccessRolePolicy(id: string, config?: FindConfig<AccessRolePolicyDTO>, sharedContext?: Context): Promise<AccessRolePolicyDTO>

	listAccessRolePolicies(
		filters?: FilterableAccessRolePolicyProps,
		config?: FindConfig<AccessRolePolicyDTO>,
		sharedContext?: Context
	): Promise<AccessRolePolicyDTO[]>

	listAndCountAccessRolePolicies(
		filters?: FilterableAccessRolePolicyProps,
		config?: FindConfig<AccessRolePolicyDTO>,
		sharedContext?: Context
	): Promise<[AccessRolePolicyDTO[], number]>

	createAccessRoleParents(data: CreateAccessRoleParentDTO, sharedContext?: Context): Promise<AccessRoleParentDTO>
	createAccessRoleParents(data: CreateAccessRoleParentDTO[], sharedContext?: Context): Promise<AccessRoleParentDTO[]>

	updateAccessRoleParents(data: UpdateAccessRoleParentDTO, sharedContext?: Context): Promise<AccessRoleParentDTO>
	updateAccessRoleParents(data: UpdateAccessRoleParentDTO[], sharedContext?: Context): Promise<AccessRoleParentDTO[]>

	deleteAccessRoleParents(ids: string | string[], sharedContext?: Context): Promise<void>

	retrieveAccessRoleParent(id: string, config?: FindConfig<AccessRoleParentDTO>, sharedContext?: Context): Promise<AccessRoleParentDTO>

	listAccessRoleParents(
		filters?: FilterableAccessRoleParentProps,
		config?: FindConfig<AccessRoleParentDTO>,
		sharedContext?: Context
	): Promise<AccessRoleParentDTO[]>

	listAndCountAccessRoleParents(
		filters?: FilterableAccessRoleParentProps,
		config?: FindConfig<AccessRoleParentDTO>,
		sharedContext?: Context
	): Promise<[AccessRoleParentDTO[], number]>

	createAccessRoleAssignments(data: CreateAccessRoleAssignmentDTO, sharedContext?: Context): Promise<AccessRoleAssignmentDTO>
	createAccessRoleAssignments(data: CreateAccessRoleAssignmentDTO[], sharedContext?: Context): Promise<AccessRoleAssignmentDTO[]>

	updateAccessRoleAssignments(data: UpdateAccessRoleAssignmentDTO, sharedContext?: Context): Promise<AccessRoleAssignmentDTO>
	updateAccessRoleAssignments(data: UpdateAccessRoleAssignmentDTO[], sharedContext?: Context): Promise<AccessRoleAssignmentDTO[]>

	deleteAccessRoleAssignments(ids: string | string[], sharedContext?: Context): Promise<void>

	retrieveAccessRoleAssignment(id: string, config?: FindConfig<AccessRoleAssignmentDTO>, sharedContext?: Context): Promise<AccessRoleAssignmentDTO>

	listAccessRoleAssignments(
		filters?: FilterableAccessRoleAssignmentProps,
		config?: FindConfig<AccessRoleAssignmentDTO>,
		sharedContext?: Context
	): Promise<AccessRoleAssignmentDTO[]>

	listAndCountAccessRoleAssignments(
		filters?: FilterableAccessRoleAssignmentProps,
		config?: FindConfig<AccessRoleAssignmentDTO>,
		sharedContext?: Context
	): Promise<[AccessRoleAssignmentDTO[], number]>

	listPoliciesForRole(roleId: string, sharedContext?: Context): Promise<AccessPolicyDTO[]>

	softDeleteAccessRoles<TReturnableLinkableKeys extends string = string>(
		roleIds: string | string[],
		config?: SoftDeleteReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	restoreAccessRoles<TReturnableLinkableKeys extends string = string>(
		roleIds: string | string[],
		config?: RestoreReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	softDeleteAccessPolicies<TReturnableLinkableKeys extends string = string>(
		policyIds: string | string[],
		config?: SoftDeleteReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	restoreAccessPolicies<TReturnableLinkableKeys extends string = string>(
		policyIds: string | string[],
		config?: RestoreReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	softDeleteAccessRolePolicies<TReturnableLinkableKeys extends string = string>(
		rolePolicyIds: string | string[],
		config?: SoftDeleteReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	restoreAccessRolePolicies<TReturnableLinkableKeys extends string = string>(
		rolePolicyIds: string | string[],
		config?: RestoreReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	softDeleteAccessRoleAssignments<TReturnableLinkableKeys extends string = string>(
		assignmentIds: string | string[],
		config?: SoftDeleteReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	restoreAccessRoleAssignments<TReturnableLinkableKeys extends string = string>(
		assignmentIds: string | string[],
		config?: RestoreReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	softDeleteAccessRoleParents<TReturnableLinkableKeys extends string = string>(
		roleParentIds: string | string[],
		config?: SoftDeleteReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
	restoreAccessRoleParents<TReturnableLinkableKeys extends string = string>(
		roleParentIds: string | string[],
		config?: RestoreReturn<TReturnableLinkableKeys>,
		sharedContext?: Context
	): Promise<Record<string, string[]> | void>
}
