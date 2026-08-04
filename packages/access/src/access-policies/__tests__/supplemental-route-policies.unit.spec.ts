import { CLOSED_OPERATIONS, PolicyResource } from '../../utils/define-policies'
import { supplementalRoutePolicies } from '../supplemental-route-policies'
import '../index'

/**
 * The hand-written counterpart to `core-route-policies.sync.unit.spec.ts`.
 *
 * That file's entries are regenerated wholesale from the installed Medusa, so a
 * structural test can compare them against their source. These are hand-written
 * gap-fillers with no source to compare against, which is exactly why they need
 * their invariants pinned: the regression this file exists to prevent already
 * happened once, when the first cut declared `GET` on dashboard chrome and would
 * have blanked saved views and layouts for every non-wildcard admin on upgrade.
 */
describe('supplemental route policies', () => {
	it('declares state-changing methods only, never a read', () => {
		const methods = new Set(supplementalRoutePolicies.flatMap(entry => entry.methods ?? []))

		expect([...methods].sort()).toEqual(['DELETE', 'POST'])
		// The scope of WP6 is state-changing routes. A read declaration here gates a
		// surface no existing role holds a grant for, so upgrading silently removes
		// access rather than adding enforcement.
		expect(methods.has('GET')).toBe(false)
	})

	it('names an explicit method on every entry', () => {
		// An entry with no `methods` expands to ALL_METHODS, which would sweep GET
		// back in through the side door the test above closes.
		const withoutMethods = supplementalRoutePolicies.filter(entry => !entry.methods?.length)

		expect(withoutMethods).toEqual([])
	})

	it('requires only operations from the closed set', () => {
		const operations = new Set(
			supplementalRoutePolicies.flatMap(entry => entry.policies.flatMap(policy => (Array.isArray(policy.operation) ? policy.operation : [policy.operation])))
		)

		for (const operation of operations) {
			expect(CLOSED_OPERATIONS).toContain(operation)
		}
	})

	it('requires only resources some policy actually registers', () => {
		// The failure this catches is the one A1 found in the pinned map: a
		// declaration naming a resource nothing declares is a grant no role can
		// hold, so the route admits wildcard holders only and denies everyone else.
		const unregistered = [...new Set(supplementalRoutePolicies.flatMap(entry => entry.policies.map(policy => policy.resource)))].filter(
			resource => !PolicyResource[resource]
		)

		expect(unregistered).toEqual([])
	})

	it('declares only admin routes, never a store or auth surface', () => {
		const offenders = supplementalRoutePolicies.map(entry => entry.matcher).filter(matcher => !matcher.startsWith('/admin/'))

		expect(offenders).toEqual([])
	})

	it('does not declare the same method and matcher twice', () => {
		const keys = supplementalRoutePolicies.flatMap(entry => (entry.methods ?? []).map(method => `${method} ${entry.matcher}`))

		// Duplicates AND with themselves harmlessly, but they mean one of the pair is
		// unreachable dead declaration nobody will notice going stale.
		expect(keys).toHaveLength(new Set(keys).size)
	})
})
