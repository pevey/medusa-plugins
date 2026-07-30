import { InferEntityType, LoaderOptions, ModulesSdkTypes } from '@medusajs/framework/types'
import { AccessPolicy, AccessRole, AccessRolePolicy } from '../models'
import { WILDCARD } from '../../../utils'

export default async ({
	container,
	options
}: LoaderOptions<ModulesSdkTypes.ModuleServiceInitializeOptions | ModulesSdkTypes.ModuleServiceInitializeCustomDataLayerOptions>): Promise<void> => {
	const accessRoleService = container.resolve('accessRoleService') as ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessRole>>

	const accessPolicyService = container.resolve('accessPolicyService') as ModulesSdkTypes.IMedusaInternalService<InferEntityType<typeof AccessPolicy>>

	const accessRolePolicyService = container.resolve('accessRolePolicyService') as ModulesSdkTypes.IMedusaInternalService<
		InferEntityType<typeof AccessRolePolicy>
	>

	// Create super admin role
	const role = await accessRoleService.upsert({
		id: 'acrl_super_admin',
		name: 'Super Admin',
		description: 'Super admin role with full access to all resources and operations'
	})

	const policy = await accessPolicyService.upsert({
		id: 'acpol_super_admin',
		key: `${WILDCARD}:${WILDCARD}`,
		resource: WILDCARD,
		operation: WILDCARD,
		name: 'Super Admin',
		description: 'Super admin policy with full access to all resources and operations'
	})

	await accessRolePolicyService.upsert({
		id: 'acrlpl_super_admin',
		role_id: role.id,
		policy_id: policy.id
	})
}
