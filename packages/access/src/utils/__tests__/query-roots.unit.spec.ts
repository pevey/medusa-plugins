/// <reference types="jest" />
import { canonicalQueryRoot, extractQueryRoots } from '../query-roots'

jest.mock('@medusajs/framework/modules-sdk', () => ({
	MedusaModule: {
		getAllJoinerConfigs: () => [
			{
				serviceName: 'customer',
				alias: [{ name: ['customer', 'customers'], entity: 'Customer' }]
			},
			{
				serviceName: 'store',
				alias: { name: 'store', entity: 'Store' }
			},
			{
				serviceName: 'access',
				alias: [
					{ name: ['access_role', 'access_roles'], entity: 'AccessRole' },
					{ name: ['access_role_policy', 'access_role_policies'], entity: 'AccessRolePolicy' },
					{ name: 'access_setting', entity: 'AccessSetting' },
					{ name: ['access_permission', 'access_permissions'] }
				]
			}
		]
	}
}))

describe('canonicalQueryRoot', () => {
	it('maps singular, plural, and entity-name spellings to the canonical snake_case name', () => {
		expect(canonicalQueryRoot('customer')).toBe('customer')
		expect(canonicalQueryRoot('customers')).toBe('customer')
		expect(canonicalQueryRoot('Customer')).toBe('customer')
		expect(canonicalQueryRoot('access_role_policies')).toBe('access_role_policy')
		expect(canonicalQueryRoot('access_setting')).toBe('access_setting')
		expect(canonicalQueryRoot('store')).toBe('store')
		expect(canonicalQueryRoot('access_permission')).toBe('access_permission')
		expect(canonicalQueryRoot('access-role')).toBe('access_role')
	})

	it('returns undefined for an unknown name', () => {
		expect(canonicalQueryRoot('warehouse')).toBeUndefined()
	})
})

describe('extractQueryRoots', () => {
	it('reads the entity shape', () => {
		expect(extractQueryRoots({ entity: 'customers', fields: ['id'] })).toEqual(['customers'])
	})

	it('reads the entryPoint and service shapes', () => {
		expect(extractQueryRoots({ entryPoint: 'currency', variables: {} })).toEqual(['currency'])
		expect(extractQueryRoots({ service: 'customer' })).toEqual(['customer'])
	})

	it('reads a remote-query __value object', () => {
		expect(extractQueryRoots({ __value: { currency: { __args: {}, fields: ['code'] } } })).toEqual(['currency'])
		expect(extractQueryRoots({ __value: { entryPoint: 'customer', fields: ['id'] } })).toEqual(['customer'])
	})

	it('returns undefined for anything it cannot parse', () => {
		expect(extractQueryRoots('SELECT 1')).toBeUndefined()
		expect(extractQueryRoots(null)).toBeUndefined()
		expect(extractQueryRoots({ __value: {} })).toBeUndefined()
	})
})
