import { describe, it, expect } from 'vitest'
import { matchRoute } from '../contracts/match.js'

const RATINGS = ['/admin/reviews', '/admin/reviews/:id', '/admin/reviews/approve', '/admin/reviews/reject', '/admin/reviews/feature']

describe('matchRoute', () => {
	it('matches an exact literal path', () => {
		expect(matchRoute(RATINGS, '/admin/reviews')).toBe('/admin/reviews')
	})

	it('matches a parameterized path', () => {
		expect(matchRoute(RATINGS, '/admin/reviews/rev_123')).toBe('/admin/reviews/:id')
	})

	it('prefers a literal segment over a parameter', () => {
		expect(matchRoute(RATINGS, '/admin/reviews/approve')).toBe('/admin/reviews/approve')
		expect(matchRoute(RATINGS, '/admin/reviews/feature')).toBe('/admin/reviews/feature')
	})

	it('matches multi-parameter paths', () => {
		const forms = ['/admin/forms/:id/fields/:fieldId/options']
		expect(matchRoute(forms, '/admin/forms/form_1/fields/fld_2/options')).toBe('/admin/forms/:id/fields/:fieldId/options')
	})

	it('does not match a different segment count', () => {
		expect(matchRoute(RATINGS, '/admin/reviews/rev_1/extra')).toBeUndefined()
	})

	it('returns undefined for an unknown path', () => {
		expect(matchRoute(RATINGS, '/admin/ratings')).toBeUndefined()
	})

	it('ignores a query string on the path', () => {
		expect(matchRoute(RATINGS, '/admin/reviews?limit=20')).toBe('/admin/reviews')
	})

	it('tolerates a leading slash difference', () => {
		expect(matchRoute(RATINGS, 'admin/reviews')).toBe('/admin/reviews')
	})

	it('does not let a trailing slash turn a list path into a detail path', () => {
		// A trailing slash adds an empty segment. If `:param` could match it, `/admin/reviews/`
		// would resolve to `/admin/reviews/:id` and the fake SDK would validate a list request
		// against the single-resource schema.
		expect(matchRoute(RATINGS, '/admin/reviews/')).toBe('/admin/reviews')
		expect(matchRoute(RATINGS, '/admin/reviews/rev_1/')).toBe('/admin/reviews/:id')
	})

	it('does not match an empty parameter segment', () => {
		expect(matchRoute(RATINGS, '/admin/reviews//')).toBeUndefined()
	})
})
