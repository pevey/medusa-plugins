/// <reference types="jest" />
import { AccessPolicySymbol, definePolicies, listDiscardedPolicies, Policy, PolicyOperation, PolicyResource } from '../define-policies'

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

})

describe('definePolicies (incomplete declarations)', () => {
	beforeEach(() => {
		;(global as any).AccessDiscardedPolicies = []
	})

	afterAll(() => {
		;(global as any).AccessDiscardedPolicies = []
	})

	// The point of the whole discard mechanism: `definePolicies` runs at
	// module-body evaluation time, so throwing here takes an operator's whole
	// application down over one third-party plugin's typo.
	it.each([
		['name', { name: '', resource: 'incomplete_thing', operation: 'read' }],
		['resource', { name: 'MissingResource', resource: '', operation: 'read' }],
		['operation', { name: 'MissingOperation', resource: 'incomplete_thing', operation: '' }]
	])('discards rather than throwing when %s is missing', (_field, policy) => {
		expect(() => definePolicies(policy as any)).not.toThrow()

		expect(listDiscardedPolicies()).toHaveLength(1)
		expect(listDiscardedPolicies()[0].reason).toBe('incomplete')
	})

	it('registers nothing at all for an incomplete declaration', () => {
		definePolicies({ name: 'HalfDeclared', resource: 'half_thing', operation: '' } as any)

		expect(Policy['HalfDeclared']).toBeUndefined()
		expect(PolicyResource['half_thing']).toBeUndefined()
	})

	it('does not throw on a null or non-object entry', () => {
		expect(() => definePolicies([null, undefined, 'nonsense'] as any)).not.toThrow()
		expect(Object.keys(Policy)).not.toContain('nonsense')
	})

	it('keeps the good policies in a batch that also holds a broken one', () => {
		const result = definePolicies([
			{ name: 'GoodOne', resource: 'batch_thing', operation: 'read' },
			{ name: '', resource: 'batch_thing', operation: 'create' }
		] as any)

		expect(result.policies.map(p => p.name)).toEqual(['GoodOne'])
		expect(Policy['GoodOne']).toBeDefined()
		expect(listDiscardedPolicies()).toHaveLength(1)
	})

	it('reports two differently-broken declarations separately, but one twice-declared one once', () => {
		definePolicies({ name: 'BrokenA', resource: '', operation: 'read' } as any)
		definePolicies({ name: 'BrokenB', resource: '', operation: 'read' } as any)
		expect(listDiscardedPolicies()).toHaveLength(2)

		// HMR and repeated imports re-run declaration; that is one bug, not two.
		definePolicies({ name: 'BrokenA', resource: '', operation: 'read' } as any)
		expect(listDiscardedPolicies()).toHaveLength(2)
	})
})

describe('definePolicies (closed operation set)', () => {
	beforeEach(() => {
		;(global as any).AccessDiscardedPolicies = []
	})

	it.each(['read', 'create', 'update', 'delete', 'export', '*'])('accepts the closed-set operation %s', operation => {
		definePolicies({ name: `Closed_${operation}`, resource: 'closed_thing', operation })

		expect(Policy[`Closed_${operation}`]).toMatchObject({ resource: 'closed_thing', operation })
		expect(listDiscardedPolicies()).toEqual([])
	})

	it('normalizes case before checking the set, so Read is accepted as read', () => {
		definePolicies({ name: 'NormalizedRead', resource: 'NormalizedThing', operation: 'Read' })

		expect(Policy['NormalizedRead']).toMatchObject({ resource: 'normalized_thing', operation: 'read' })
		expect(listDiscardedPolicies()).toEqual([])
	})

	it('discards a policy whose operation is outside the set, without throwing', () => {
		expect(() => definePolicies({ name: 'TypoPolicy', resource: 'typo_thing', operation: 'updte' })).not.toThrow()

		expect(Policy['TypoPolicy']).toBeUndefined()
		expect(PolicyOperation['updte']).toBeUndefined()
		// The resource goes with it — registering it would make the field filter
		// gate an entity no role can ever hold a read grant on.
		expect(PolicyResource['typo_thing']).toBeUndefined()
	})

	it('omits the discarded policy from the returned export', () => {
		const result = definePolicies([
			{ name: 'KeptRead', resource: 'mixed_thing', operation: 'read' },
			{ name: 'DroppedApprove', resource: 'mixed_thing', operation: 'approve' }
		])

		expect(result.policies.map(p => p.name)).toEqual(['KeptRead'])
	})

	it('records the discard with the raw operation, the normalized key, and the policy name', () => {
		definePolicies({ name: 'RecordedTypo', resource: 'recorded_thing', operation: 'updte' })

		expect(listDiscardedPolicies()).toEqual([
			expect.objectContaining({
				name: 'RecordedTypo',
				resource: 'recorded_thing',
				operation: 'updte',
				key: 'recorded_thing:updte'
			})
		])
	})

	it('records a repeated declaration once, so HMR and re-imports do not stack duplicates', () => {
		definePolicies({ name: 'RepeatedTypo', resource: 'repeat_thing', operation: 'updte' })
		definePolicies({ name: 'RepeatedTypo', resource: 'repeat_thing', operation: 'updte' })

		expect(listDiscardedPolicies()).toHaveLength(1)
	})

	it('keeps the valid policies in a batch that also contains an invalid one', () => {
		definePolicies([
			{ name: 'BatchRead', resource: 'batch_thing', operation: 'read' },
			{ name: 'BatchBogus', resource: 'batch_thing', operation: 'frobnicate' },
			{ name: 'BatchDelete', resource: 'batch_thing', operation: 'delete' }
		])

		expect(Policy['BatchRead']).toBeDefined()
		expect(Policy['BatchDelete']).toBeDefined()
		expect(Policy['BatchBogus']).toBeUndefined()
		expect(listDiscardedPolicies()).toHaveLength(1)
	})
})
