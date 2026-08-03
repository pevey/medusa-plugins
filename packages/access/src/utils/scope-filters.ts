export type ScopeMerge = { kind: 'filters'; filters: Record<string, unknown> } | { kind: 'empty' } | { kind: 'unmergeable'; key: string }

const isScalar = (value: unknown): value is string | number | boolean => ['string', 'number', 'boolean'].includes(typeof value)

const asScalarSet = (value: unknown): (string | number | boolean)[] | undefined => {
	if (isScalar(value)) return [value]
	if (Array.isArray(value) && value.every(isScalar)) return [...new Set(value)]
	return undefined
}

const isMatchNothing = (filter: Record<string, unknown>): boolean => Object.values(filter).some(value => Array.isArray(value) && value.length === 0)

export function combineScopeFilters(filters: Record<string, unknown>[]): Record<string, unknown> {
	if (filters.length === 0) throw new Error('combineScopeFilters requires at least one filter')
	const matchingSurvivors = filters.filter(filter => !isMatchNothing(filter))
	if (matchingSurvivors.length === 0) return filters[0]
	if (matchingSurvivors.length === 1) return matchingSurvivors[0]
	const keys = new Set(matchingSurvivors.flatMap(filter => Object.keys(filter)))
	if (keys.size === 1 && matchingSurvivors.every(filter => Object.keys(filter).length === 1)) {
		const key = [...keys][0]
		const union = matchingSurvivors.flatMap(filter => asScalarSet(filter[key]) ?? [])
		if (matchingSurvivors.every(filter => asScalarSet(filter[key]))) {
			return { [key]: [...new Set(union)] }
		}
	}
	return { $or: matchingSurvivors }
}

export function mergeScopeFilter(handlerFilters: Record<string, unknown> | undefined, scopeFilter: Record<string, unknown>): ScopeMerge {
	for (const value of Object.values(scopeFilter)) {
		if (Array.isArray(value) && value.length === 0) return { kind: 'empty' }
	}
	if (!handlerFilters || Object.keys(handlerFilters).length === 0) {
		return { kind: 'filters', filters: { ...scopeFilter } }
	}
	const merged: Record<string, unknown> = { ...handlerFilters }
	for (const [key, scopeValue] of Object.entries(scopeFilter)) {
		if (!(key in merged)) {
			merged[key] = scopeValue
			continue
		}
		const left = asScalarSet(merged[key])
		const right = asScalarSet(scopeValue)
		if (!left || !right || key.startsWith('$')) {
			return { kind: 'unmergeable', key }
		}
		const rightSet = new Set(right)
		const intersection = left.filter(value => rightSet.has(value))
		if (intersection.length === 0) return { kind: 'empty' }
		merged[key] = intersection
	}
	return { kind: 'filters', filters: merged }
}
