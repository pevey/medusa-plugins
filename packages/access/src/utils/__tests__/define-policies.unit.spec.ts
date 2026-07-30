import { AccessPolicySymbol, definePolicies, Policy } from '../define-policies'

describe('definePolicies (independent identity)', () => {
	it('registers into global.AccessPolicy and tags the export with AccessPolicySymbol', () => {
		const result = definePolicies({
			name: 'ReadThing',
			resource: 'thing',
			operation: 'read'
		})

		expect((result as any)[AccessPolicySymbol]).toBe(true)
		expect(result.policies[0]).toMatchObject({ resource: 'thing', operation: 'read' })

		// registered into our module registry + our global namespace
		expect(Policy['ReadThing']).toMatchObject({ resource: 'thing', operation: 'read' })
		expect((global as any).AccessPolicy['ReadThing']).toBeDefined()
	})

	it("does NOT touch Medusa's global.Policy registry", () => {
		definePolicies({ name: 'CreateThing', resource: 'thing', operation: 'create' })

		const medusaPolicy = (global as any).Policy
		if (medusaPolicy) {
			expect(medusaPolicy['CreateThing']).toBeUndefined()
		} else {
			expect(medusaPolicy).toBeUndefined()
		}
	})

	it('throws when a policy is missing required fields', () => {
		expect(() => definePolicies({ name: '', resource: 'x', operation: 'read' } as any)).toThrow()
	})
})
