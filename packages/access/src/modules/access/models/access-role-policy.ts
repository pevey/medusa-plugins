import { model } from '@medusajs/framework/utils'
import AccessPolicy from './access-policy'
import AccessRole from './access-role'

const AccessRolePolicy = model
	.define('access_role_policy', {
		id: model.id({ prefix: 'acrlpl' }).primaryKey(),
		role: model.belongsTo(() => AccessRole),
		policy: model.belongsTo(() => AccessPolicy),
		metadata: model.json().nullable()
	})
	.indexes([
		{ on: ['role_id'], where: 'deleted_at IS NULL' },
		{ on: ['policy_id'], where: 'deleted_at IS NULL' },
		{ on: ['role_id', 'policy_id'], unique: true, where: 'deleted_at IS NULL' }
	])

export default AccessRolePolicy
