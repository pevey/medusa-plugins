import { model } from '@medusajs/framework/utils'
import AccessRole from './access-role'

/**
 * A grantee's holding of a role, optionally pinned to a tenant.
 *
 * `grantee_type`/`grantee_id` name who holds the role — an actor (`user`,
 * `customer`, `api_key`, `invite`) or a non-actor entity reached from actors
 * through registered grantee paths (`customer_group`, `company`, ...). Values
 * are Query entity names.
 *
 * `scope_type`/`scope_id` pin the holding to a tenancy dimension value
 * (`sales_channel`/`sc_123`). Both set or both null — enforced by a CHECK
 * constraint in the migration (the model DSL cannot express it) and validated
 * in the service. Null means the role applies everywhere.
 *
 * Uniqueness over (role, grantee, scope) uses COALESCE expressions in a raw
 * partial index (also migration-only): a plain unique index treats NULLs as
 * distinct and would admit duplicate unscoped assignments.
 */
const AccessRoleAssignment = model
	.define('access_role_assignment', {
		id: model.id({ prefix: 'acasg' }).primaryKey(),
		role: model.belongsTo(() => AccessRole, { mappedBy: 'assignments' }),
		grantee_type: model.text(),
		grantee_id: model.text(),
		scope_type: model.text().nullable(),
		scope_id: model.text().nullable(),
		metadata: model.json().nullable()
	})
	.indexes([
		{ on: ['role_id'], where: 'deleted_at IS NULL' },
		{ on: ['grantee_type', 'grantee_id'], where: 'deleted_at IS NULL' },
		{ on: ['scope_type', 'scope_id', 'grantee_type', 'grantee_id'], where: 'deleted_at IS NULL' }
	])

export default AccessRoleAssignment
