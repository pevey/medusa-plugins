import { Context, FindConfig, InferEntityType, ModulesSdkTypes } from '@medusajs/framework/types'
import {
	InjectManager,
	InjectTransactionManager,
	MedusaContext,
	MedusaService,
	promiseAll
} from '@medusajs/framework/utils'
import { Policy, WILDCARD } from '../../utils'
import {
	AccessRoleDTO,
	CreateAccessRoleParentDTO,
	FilterableAccessRoleProps,
	IAccessModuleService,
	AccessRoleParentDTO,
	UpdateAccessRoleParentDTO
} from './types'
import { AccessPolicy, AccessRole, AccessRoleParent, AccessRolePolicy } from './models'
import { AccessRepository } from './repositories'
import { bootstrapSuperAdminWorkflow } from '../../workflows/access/workflows/bootstrap-super-admin'

type InjectedDependencies = {
	accessRepository: AccessRepository
	accessRolePolicyService: ModulesSdkTypes.IMedusaInternalService<
		InferEntityType<typeof AccessRolePolicy>
	>
	accessRoleService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessRole>>
	accessPolicyService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessPolicy>>
}

const SUPER_ADMIN_KEY = `${WILDCARD}:${WILDCARD}`

export class AccessModuleService
	extends MedusaService({
		AccessRole,
		AccessPolicy,
		AccessRoleParent,
		AccessRolePolicy
	})
	implements IAccessModuleService
{
	protected readonly accessRepository_: AccessRepository
	protected readonly accessRolePolicyService: ModulesSdkTypes.IMedusaInternalService<
		InferEntityType<typeof AccessRolePolicy>
	>
	protected readonly accessRoleService: ModulesSdkTypes.IMedusaInternalService<
		InferEntityType<typeof AccessRole>
	>
	protected readonly accessPolicyService: ModulesSdkTypes.IMedusaInternalService<
		InferEntityType<typeof AccessPolicy>
	>

	constructor({
		accessRepository,
		accessRoleService,
		accessPolicyService,
		accessRolePolicyService
	}: InjectedDependencies) {
		// @ts-ignore
		super(...arguments)
		this.accessRepository_ = accessRepository
		this.accessRolePolicyService = accessRolePolicyService
		this.accessRoleService = accessRoleService
		this.accessPolicyService = accessPolicyService
	}

	__hooks = {
		onApplicationStart: async () => {
			await this.syncRegisteredPolicies()

			// First-load bootstrap: grant super-admin to existing users so installing
			// the plugin (which gates the whole admin) does not lock out the operator.
			// Runs the workflow WITHOUT a container so its steps resolve sibling
			// modules (user, query, link) from the global registry. Best-effort:
			// in isolated contexts (e.g. the module test runner) this is skipped.
			try {
				await bootstrapSuperAdminWorkflow().run({})
			} catch {
				// no-op: bootstrap requires the full app (user module + links)
			}
		}
	}

	@InjectTransactionManager()
	private async syncRegisteredPolicies(
		@MedusaContext() sharedContext: Context = {}
	): Promise<void> {
		const registeredPolicies = Object.entries(Policy).map(
			([name, { resource, operation, description }]) => ({
				key: `${resource}:${operation}`,
				name,
				resource,
				operation,
				description
			})
		)

		const registeredKeys = registeredPolicies.map(p => p.key)

		// Fetch all existing policies (including soft-deleted ones)
		const existingPolicies = await this.listAccessPolicies(
			{},
			{ withDeleted: true },
			sharedContext
		)

		const existingPoliciesMap = new Map(existingPolicies.map(p => [p.key, p]))

		const policiesToCreate: any[] = []
		const policiesToUpdate: any[] = []
		const policiesToRestore: string[] = []

		// Process registered policies
		for (const registeredPolicy of registeredPolicies) {
			if (registeredPolicy.key === SUPER_ADMIN_KEY) {
				continue
			}

			const existing = existingPoliciesMap.get(registeredPolicy.key)

			const hasChanges =
				existing &&
				(existing.name !== registeredPolicy.name ||
					existing.description !== registeredPolicy.description)

			if (!existing) {
				policiesToCreate.push(registeredPolicy)
			} else if (existing.deleted_at) {
				policiesToRestore.push(existing.id)
				if (hasChanges) {
					policiesToUpdate.push({
						id: existing.id,
						name: registeredPolicy.name,
						description: registeredPolicy.description
					})
				}
			} else if (hasChanges) {
				policiesToUpdate.push({
					id: existing.id,
					name: registeredPolicy.name,
					description: registeredPolicy.description
				})
			}
		}

		const policiesToSoftDelete = existingPolicies
			.filter(p => !p.deleted_at && !registeredKeys.includes(p.key) && p.key !== SUPER_ADMIN_KEY)
			.map(p => p.id)

		// First restore any soft-deleted policies
		if (policiesToRestore.length > 0) {
			await this.restoreAccessPolicies(policiesToRestore, {}, sharedContext)
		}

		await promiseAll([
			policiesToCreate.length > 0 &&
				this.accessPolicyService.create(policiesToCreate, sharedContext),
			policiesToUpdate.length > 0 &&
				this.accessPolicyService.upsert(policiesToUpdate, sharedContext),
			policiesToSoftDelete.length > 0 &&
				this.accessPolicyService.softDelete(policiesToSoftDelete, sharedContext)
		])
	}

	@InjectManager()
	async listPoliciesForRole(
		roleId: string,
		@MedusaContext() sharedContext: Context = {}
	): Promise<any[]> {
		return await this.accessRepository_.listPoliciesForRole(roleId, sharedContext)
	}

	@InjectManager()
	// @ts-expect-error
	async listAccessRoles(
		filters: FilterableAccessRoleProps = {},
		config: FindConfig<AccessRoleDTO> = {},
		@MedusaContext() sharedContext: Context = {}
	): Promise<AccessRoleDTO[]> {
		const roles = await super.listAccessRoles(filters, config as any, sharedContext)

		const shouldIncludePolicies =
			config.relations?.includes('policies') || config.select?.includes('policies')

		if (shouldIncludePolicies && roles.length > 0) {
			const roleIds = roles.map(role => role.id)
			const policiesByRole = await this.accessRepository_.listPoliciesForRoles(
				roleIds,
				sharedContext
			)

			for (const role of roles) {
				role.policies = policiesByRole.get(role.id) || []
			}
		}

		return roles as unknown as AccessRoleDTO[]
	}

	@InjectManager()
	// @ts-expect-error
	async listAndCountAccessRoles(
		filters: FilterableAccessRoleProps = {},
		config: FindConfig<AccessRoleDTO> = {},
		@MedusaContext() sharedContext: Context = {}
	): Promise<[AccessRoleDTO[], number]> {
		const [roles, count] = await super.listAndCountAccessRoles(
			filters,
			config as any,
			sharedContext
		)

		const shouldIncludePolicies =
			config.relations?.includes('policies') || config.select?.includes('policies')

		if (shouldIncludePolicies && roles.length > 0) {
			const roleIds = roles.map(role => role.id)
			const policiesByRole = await this.accessRepository_.listPoliciesForRoles(
				roleIds,
				sharedContext
			)

			for (const role of roles) {
				role.policies = policiesByRole.get(role.id) || []
			}
		}

		return [roles as unknown as AccessRoleDTO[], count]
	}

	@InjectManager()
	// @ts-expect-error
	async createAccessRoleParents(
		data: CreateAccessRoleParentDTO[],
		@MedusaContext() sharedContext: Context = {}
	): Promise<AccessRoleParentDTO[]> {
		for (const parent of data) {
			const { role_id, parent_id } = parent

			if (role_id === parent_id) {
				throw new Error(
					`Cannot create role parent relationship: a role cannot be its own parent (role_id: ${role_id})`
				)
			}

			const wouldCreateCycle = await this.accessRepository_.checkForCycle(
				role_id,
				parent_id,
				sharedContext
			)

			if (wouldCreateCycle) {
				throw new Error(
					`Cannot create role parent relationship: this would create a circular dependency (role_id: ${role_id}, parent_id: ${parent_id})`
				)
			}
		}

		return await super.createAccessRoleParents(data, sharedContext)
	}

	@InjectManager()
	// @ts-expect-error
	async updateAccessRoleParents(
		data: UpdateAccessRoleParentDTO[],
		@MedusaContext() sharedContext: Context = {}
	): Promise<AccessRoleParentDTO[]> {
		for (const parent of data) {
			const { role_id, parent_id } = parent

			if (parent_id) {
				if (role_id === parent_id) {
					throw new Error(
						`Cannot update role parent relationship: a role cannot be its own parent (role_id: ${role_id})`
					)
				}

				const wouldCreateCycle = await this.accessRepository_.checkForCycle(
					role_id!,
					parent_id,
					sharedContext
				)

				if (wouldCreateCycle) {
					throw new Error(
						`Cannot update role parent relationship: this would create a circular dependency (role_id: ${role_id}, parent_id: ${parent_id})`
					)
				}
			}
		}

		return await super.updateAccessRoleParents(data, sharedContext)
	}
}
