// Route resolution for the contract fake. Literal segments beat `:param` segments so
// /admin/reviews/approve never resolves to /admin/reviews/:id — a real ambiguity in the
// ratings plugin, where the action routes are siblings of the detail route.

// A single trailing slash must not create a phantom empty segment: `/admin/reviews/` is the
// list route, and letting `:id` absorb the empty segment would hand the fake SDK the detail
// route's schema for a list request. Only one trailing slash is stripped (not `/+`) so that
// interior doubles like `/admin/reviews//` still produce a real empty segment for the
// `:param` guard below to reject — a greedy strip would collapse it to the same 2-segment
// shape as `/admin/reviews` and match the list route by accident.
const segments = (value: string) => value.replace(/\?.*$/, '').replace(/^\/+/, '').replace(/\/$/, '').split('/')

type Candidate = { matcher: string; literalCount: number }

export function matchRoute(matchers: string[], path: string): string | undefined {
	const pathSegments = segments(path)
	const candidates: Candidate[] = []

	for (const matcher of matchers) {
		const matcherSegments = segments(matcher)
		if (matcherSegments.length !== pathSegments.length) continue

		let literalCount = 0
		let matched = true
		for (let i = 0; i < matcherSegments.length; i++) {
			const expected = matcherSegments[i]
			if (expected.startsWith(':')) {
				// A parameter stands for a real value. An empty segment (from `//`) is not one.
				if (pathSegments[i] === '') {
					matched = false
					break
				}
				continue
			}
			if (expected !== pathSegments[i]) {
				matched = false
				break
			}
			literalCount++
		}
		if (matched) candidates.push({ matcher, literalCount })
	}

	if (candidates.length === 0) return undefined
	candidates.sort((a, b) => b.literalCount - a.literalCount)
	return candidates[0].matcher
}
