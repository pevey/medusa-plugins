/// <reference types="jest" />
import { combineScopeFilters, mergeScopeFilter } from '../scope-filters'

describe('combineScopeFilters', () => {
	it('returns a single filter unchanged', () => {
		expect(combineScopeFilters([{ company_id: 'comp_1' }])).toEqual({ company_id: 'comp_1' })
	})

	it('unions values when every filter uses the same single key', () => {
		expect(combineScopeFilters([{ id: ['c_1', 'c_2'] }, { id: ['c_2', 'c_3'] }])).toEqual({ id: ['c_1', 'c_2', 'c_3'] })
	})

	it('falls back to $or for filters on different keys', () => {
		expect(combineScopeFilters([{ company_id: 'comp_1' }, { id: ['c_1'] }])).toEqual({ $or: [{ company_id: 'comp_1' }, { id: ['c_1'] }] })
	})

	it('drops match-nothing branches from $or', () => {
		expect(combineScopeFilters([{ id: [] }, { company_id: 'comp_1' }])).toEqual({ company_id: 'comp_1' })
	})

	it('preserves same-key union behavior when a branch is empty', () => {
		expect(combineScopeFilters([{ id: [] }, { id: ['c_1'] }])).toEqual({ id: ['c_1'] })
	})

	it('throws when given no filters', () => {
		expect(() => combineScopeFilters([])).toThrow(/at least one/)
	})
})

describe('mergeScopeFilter', () => {
	it('uses the scope filter alone when the handler has none', () => {
		expect(mergeScopeFilter(undefined, { company_id: 'comp_1' })).toEqual({ kind: 'filters', filters: { company_id: 'comp_1' } })
	})

	it('spread-merges disjoint keys', () => {
		expect(mergeScopeFilter({ customer_id: 'cus_1' }, { company_id: 'comp_1' })).toEqual({
			kind: 'filters',
			filters: { customer_id: 'cus_1', company_id: 'comp_1' }
		})
	})

	it('intersects a colliding key, scalar against array', () => {
		expect(mergeScopeFilter({ id: 'c_2' }, { id: ['c_1', 'c_2'] })).toEqual({ kind: 'filters', filters: { id: ['c_2'] } })
	})

	it('reports empty on a disjoint intersection', () => {
		expect(mergeScopeFilter({ id: 'c_9' }, { id: ['c_1', 'c_2'] })).toEqual({ kind: 'empty' })
	})

	it('reports empty for an empty-array scope value, even with no collision', () => {
		expect(mergeScopeFilter({ company_id: 'comp_1' }, { id: [] })).toEqual({ kind: 'empty' })
	})

	it('is unmergeable when the handler side of a collision is an operator object', () => {
		expect(mergeScopeFilter({ company_id: { $ne: 'comp_2' } }, { company_id: 'comp_1' })).toEqual({ kind: 'unmergeable', key: 'company_id' })
	})

	it('is unmergeable when the collision is on $or', () => {
		expect(mergeScopeFilter({ $or: [{ company_id: 'comp_1' }] }, { $or: [{ id: ['c_1'] }] })).toEqual({ kind: 'unmergeable', key: '$or' })
	})

	it('keeps a scope $or alongside disjoint handler keys', () => {
		expect(mergeScopeFilter({ customer_id: 'cus_1' }, { $or: [{ company_id: 'comp_1' }, { id: ['c_1'] }] })).toEqual({
			kind: 'filters',
			filters: { customer_id: 'cus_1', $or: [{ company_id: 'comp_1' }, { id: ['c_1'] }] }
		})
	})

	it('reports empty when all branches are match-nothing', () => {
		expect(mergeScopeFilter(undefined, combineScopeFilters([{ id: [] }, { name: [] }]))).toEqual({ kind: 'empty' })
	})
})
