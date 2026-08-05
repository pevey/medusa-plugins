/// <reference types="jest" />
import { generateResourcePolicies } from '../generate-resource-policies'
import { defaultPolicyOperations } from '../default-policy-operations'

describe('generateResourcePolicies', () => {
	it('excludes ALL and wildcard from default operations', () => {
		expect(defaultPolicyOperations).toEqual(expect.arrayContaining(['read', 'create', 'update', 'delete']))
		expect(defaultPolicyOperations).not.toContain('*')
		expect(defaultPolicyOperations).not.toContain('ALL')
	})

	it('generates a PascalCase-named policy per resource/operation', () => {
		const policies = generateResourcePolicies(['thing'])

		const names = policies.map(p => p.name)
		expect(names).toEqual(expect.arrayContaining(['ReadThing', 'CreateThing', 'UpdateThing', 'DeleteThing']))
		const read = policies.find(p => p.name === 'ReadThing')
		expect(read).toMatchObject({ resource: 'thing', operation: 'read' })
		expect(read?.description).toBe('Read Thing')
	})
})
