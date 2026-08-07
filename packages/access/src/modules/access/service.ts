import { Context, FindConfig, InferEntityType, ModulesSdkTypes } from '@medusajs/framework/types'
import { InjectManager, InjectTransactionManager, MedusaContext, MedusaError, MedusaService, Modules, promiseAll } from '@medusajs/framework/utils'
import { Policy, WILDCARD } from '../../utils'
import {
	reportDiscardedPolicies,
	reportRouteCoverage,
	reportScopedMutationClosure,
	reportTenancyCoverage,
	reportUnregisteredGuardResources
} from '../../utils/route-coverage'
import {
	AccessRoleDTO,
	CreateAccessRoleAssignmentDTO,
	CreateAccessRoleParentDTO,
	FilterableAccessRoleProps,
	IAccessModuleService,
	AccessRoleAssignmentDTO,
	AccessRoleParentDTO,
	UpdateAccessRoleAssignmentDTO,
	UpdateAccessRoleParentDTO
} from './types'
import { AccessPolicy, AccessRole, AccessRoleAssignment, AccessRoleParent, AccessRolePolicy } from './models'
import { AccessRepository } from './repositories'
import { BOOTSTRAP_SUPER_ADMIN_EVENT } from '../../workflows/access/workflows/bootstrap-super-admin'

type InjectedDependencies = {
	accessRepository: AccessRepository
	accessRolePolicyService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessRolePolicy>>
	accessRoleService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessRole>>
	accessPolicyService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessPolicy>>
}

const SUPER_ADMIN_KEY = `${WILDCARD}:${WILDCARD}`

export class AccessModuleService
	extends MedusaService({
		AccessRole,
		AccessPolicy,
		AccessRoleAssignment,
		AccessRoleParent,
		AccessRolePolicy
	})
	implements IAccessModuleService
{
	protected readonly accessRepository_: AccessRepository
	protected readonly accessRolePolicyService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessRolePolicy>>
	protected readonly accessRoleService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessRole>>
	protected readonly accessPolicyService: ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessPolicy>>
	protected readonly container_: InjectedDependencies

	constructor(container: InjectedDependencies) {
		// @ts-ignore
		super(...arguments)
		this.container_ = container
		this.accessRepository_ = container.accessRepository
		this.accessRolePolicyService = container.accessRolePolicyService
		this.accessRoleService = container.accessRoleService
		this.accessPolicyService = container.accessPolicyService
	}

	__hooks = {
		// Medusa calls this after ALL modules finish loading (and after subscribers
		// are registered), but it runs bound to the module service, whose container
		// cannot resolve cross-module services like `query`/`link` — so we can't run
		// the bootstrap workflow here directly. Instead we emit an event and let a
		// subscriber (which receives the full app container) run the workflow. This
		// mirrors the search plugin's seed-on-startup pattern.
		onApplicationStart: async () => {
			await this.syncRegisteredPolicies()

			// First-load bootstrap: grant super-admin to existing users so installing
			// the plugin (which gates the whole admin) does not lock out the operator.
			const logger = (this.container_ as any).logger ?? console

			// Runs after entrypoints load, so every route has registered by now.
			// Advisory only — undeclared routes still pass unless sealed.
			reportRouteCoverage(logger)

			// Not advisory: a discarded policy strands every route requiring it, so
			// this runs where routes are known and can be named alongside it.
			reportDiscardedPolicies(logger)

			// The other half of the same failure: a declaration naming a resource
			// nobody ever declared a policy for. Same outcome — a grant no role can
			// hold — but nothing lands on the discarded list, so it needs its own
			// join against the policy registry. Runs after syncRegisteredPolicies so
			// the registry is fully populated.
			reportUnregisteredGuardResources(logger)

			// What tenancy-scoped actors can and cannot reach: the mutating core
			// surface with no derivable row target, and coverage declared under
			// names the interceptor can never narrow.
			reportScopedMutationClosure(logger)
			reportTenancyCoverage(logger)

			try {
				const eventBus = (this.container_ as any)[Modules.EVENT_BUS]
				if (!eventBus) {
					logger.warn?.('[access] cannot bootstrap super-admin on startup — event bus module is not configured')
					return
				}
				await eventBus.emit({ name: BOOTSTRAP_SUPER_ADMIN_EVENT, data: {} })
			} catch (error) {
				logger.error?.(`[access] failed to emit super-admin bootstrap event: ${(error as Error).message}`)
			}
		}
	}

	@InjectTransactionManager()
	private async syncRegisteredPolicies(@MedusaContext() sharedContext: Context = {}): Promise<void> {
		const registeredPolicies = Object.entries(Policy).map(([name, { resource, operation, description }]) => ({
			key: `${resource}:${operation}`,
			name,
			resource,
			operation,
			description
		}))

		const registeredKeys = registeredPolicies.map(p => p.key)

		// Fetch all existing policies (including soft-deleted ones)
		const existingPolicies = await this.listAccessPolicies({}, { withDeleted: true }, sharedContext)

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

			const hasChanges = existing && (existing.name !== registeredPolicy.name || existing.description !== registeredPolicy.description)

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

		const policiesToSoftDelete = existingPolicies.filter(p => !p.deleted_at && !registeredKeys.includes(p.key) && p.key !== SUPER_ADMIN_KEY).map(p => p.id)

		// First restore any soft-deleted policies
		if (policiesToRestore.length > 0) {
			await this.restoreAccessPolicies(policiesToRestore, {}, sharedContext)
		}

		await promiseAll([
			policiesToCreate.length > 0 && this.accessPolicyService.create(policiesToCreate, sharedContext),
			policiesToUpdate.length > 0 && this.accessPolicyService.upsert(policiesToUpdate, sharedContext),
			policiesToSoftDelete.length > 0 && this.accessPolicyService.softDelete(policiesToSoftDelete, sharedContext)
		])
	}

	@InjectManager()
	async listPoliciesForRole(roleId: string, @MedusaContext() sharedContext: Context = {}): Promise<any[]> {
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

		const shouldIncludePolicies = config.relations?.includes('policies') || config.select?.includes('policies')

		if (shouldIncludePolicies && roles.length > 0) {
			const roleIds = roles.map(role => role.id)
			const policiesByRole = await this.accessRepository_.listPoliciesForRoles(roleIds, sharedContext)

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
		const [roles, count] = await super.listAndCountAccessRoles(filters, config as any, sharedContext)

		const shouldIncludePolicies = config.relations?.includes('policies') || config.select?.includes('policies')

		if (shouldIncludePolicies && roles.length > 0) {
			const roleIds = roles.map(role => role.id)
			const policiesByRole = await this.accessRepository_.listPoliciesForRoles(roleIds, sharedContext)

			for (const role of roles) {
				role.policies = policiesByRole.get(role.id) || []
			}
		}

		return [roles as unknown as AccessRoleDTO[], count]
	}

	@InjectManager()
	// @ts-expect-error
	async createAccessRoleParents(data: CreateAccessRoleParentDTO[], @MedusaContext() sharedContext: Context = {}): Promise<AccessRoleParentDTO[]> {
		for (const parent of data) {
			const { role_id, parent_id } = parent

			if (role_id === parent_id) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Cannot create role parent relationship: a role cannot be its own parent (role_id: ${role_id})`
				)
			}

			const wouldCreateCycle = await this.accessRepository_.checkForCycle(role_id, parent_id, sharedContext)

			if (wouldCreateCycle) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Cannot create role parent relationship: this would create a circular dependency (role_id: ${role_id}, parent_id: ${parent_id})`
				)
			}
		}

		return await super.createAccessRoleParents(data, sharedContext)
	}

	@InjectManager()
	// @ts-expect-error
	async updateAccessRoleParents(data: UpdateAccessRoleParentDTO[], @MedusaContext() sharedContext: Context = {}): Promise<AccessRoleParentDTO[]> {
		for (const parent of data) {
			const { role_id, parent_id } = parent

			if (parent_id) {
				if (role_id === parent_id) {
					throw new MedusaError(
						MedusaError.Types.INVALID_DATA,
						`Cannot update role parent relationship: a role cannot be its own parent (role_id: ${role_id})`
					)
				}

				const wouldCreateCycle = await this.accessRepository_.checkForCycle(role_id!, parent_id, sharedContext)

				if (wouldCreateCycle) {
					throw new MedusaError(
						MedusaError.Types.INVALID_DATA,
						`Cannot update role parent relationship: this would create a circular dependency (role_id: ${role_id}, parent_id: ${parent_id})`
					)
				}
			}
		}

		return await super.updateAccessRoleParents(data, sharedContext)
	}

	/**
	 * `scope_type`/`scope_id` must be set together or not at all. The DB CHECK
	 * constraint enforces the same; validating here keeps the error friendly
	 * before it is constraint-shaped.
	 */
	private assertScopePair(scopeType: string | null | undefined, scopeId: string | null | undefined): void {
		const hasType = (scopeType ?? null) !== null
		const hasId = (scopeId ?? null) !== null

		if (hasType !== hasId) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Role assignment scope_type and scope_id must be provided together (scope_type: ${scopeType ?? 'null'}, scope_id: ${scopeId ?? 'null'})`
			)
		}
	}

	@InjectManager()
	// @ts-expect-error
	async createAccessRoleAssignments(
		data: CreateAccessRoleAssignmentDTO | CreateAccessRoleAssignmentDTO[],
		@MedusaContext() sharedContext: Context = {}
	): Promise<AccessRoleAssignmentDTO | AccessRoleAssignmentDTO[]> {
		const items = Array.isArray(data) ? data : [data]
		for (const item of items) {
			this.assertScopePair(item.scope_type, item.scope_id)
		}

		return await super.createAccessRoleAssignments(data as CreateAccessRoleAssignmentDTO[], sharedContext)
	}

	@InjectManager()
	// @ts-expect-error
	async updateAccessRoleAssignments(
		data: UpdateAccessRoleAssignmentDTO | UpdateAccessRoleAssignmentDTO[],
		@MedusaContext() sharedContext: Context = {}
	): Promise<AccessRoleAssignmentDTO | AccessRoleAssignmentDTO[]> {
		const items = Array.isArray(data) ? data : [data]

		// A payload touching only one half of the scope pair is validated against
		// the other half's current value, so a lone `scope_id` update cannot
		// slip past the both-or-neither rule.
		const halfTouched = items.filter(item => 'scope_type' in item !== 'scope_id' in item)
		const current = new Map<string, AccessRoleAssignmentDTO>()
		if (halfTouched.length > 0) {
			const rows = await super.listAccessRoleAssignments({ id: halfTouched.map(item => item.id) }, {}, sharedContext)
			for (const row of rows) {
				current.set(row.id, row as AccessRoleAssignmentDTO)
			}
		}

		for (const item of items) {
			const touchesType = 'scope_type' in item
			const touchesId = 'scope_id' in item

			if (!touchesType && !touchesId) {
				continue
			}

			if (touchesType && touchesId) {
				this.assertScopePair(item.scope_type, item.scope_id)
				continue
			}

			const row = current.get(item.id)
			if (!row) {
				// Unknown id — super's update throws the not-found error.
				continue
			}

			this.assertScopePair(touchesType ? item.scope_type : row.scope_type, touchesId ? item.scope_id : row.scope_id)
		}

		return await super.updateAccessRoleAssignments(data as UpdateAccessRoleAssignmentDTO[], sharedContext)
	}
}
