import { model } from '@medusajs/framework/utils'
import AccessRole from './access-role'

const AccessRoleParent = model
	.define('access_role_parent', {
		id: model.id({ prefix: 'acrlpar' }).primaryKey(),
		role: model.belongsTo(() => AccessRole, { mappedBy: 'parents' }),
		parent: model.belongsTo(() => AccessRole),
		metadata: model.json().nullable()
	})
	.indexes([
		{ on: ['role_id'], where: 'deleted_at IS NULL' },
		{ on: ['parent_id'], where: 'deleted_at IS NULL' },
		{ on: ['role_id', 'parent_id'], unique: true, where: 'deleted_at IS NULL' }
	])

export default AccessRoleParent
