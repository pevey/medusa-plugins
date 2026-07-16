import { SYSTEM_RUBRICS } from '../modules/analytics/constants'

type RubricLister = {
	listAnalyticsRubrics: (filter: { active: boolean }) => Promise<{ name: string }[]>
}

// Process-wide cache of allowed event names (SYSTEM_RUBRICS ∪ active rubrics),
// shared across requests so the public /store/ping endpoint isn't querying
// rubrics on every hit. Invalidated whenever a rubric is created/updated/deleted.
let cache: { names: Set<string>; expiry: number } | null = null
const TTL_MS = 60_000

export function invalidateRubricCache(): void {
	cache = null
}

/**
 * The set of event names allowed to be stored: the built-in system rubrics plus
 * every active custom rubric. Used to gate the public store ingest endpoint.
 */
export async function getAllowedEventNames(service: RubricLister): Promise<Set<string>> {
	const now = Date.now()
	if (cache && now < cache.expiry) {
		return cache.names
	}

	const rubrics = await service.listAnalyticsRubrics({ active: true })
	const names = new Set<string>([...SYSTEM_RUBRICS, ...rubrics.map((r) => r.name)])
	cache = { names, expiry: now + TTL_MS }
	return names
}
