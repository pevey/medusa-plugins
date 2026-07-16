// Private module singleton holding the browser analytics collector created by
// the <Analytics> layout component. `track`/`identify` (public, in ../analytics)
// delegate to it. Only ever set in the browser, so SSR keeps it null (no
// cross-request state leak).
import type { AnalyticsCollector } from '@pevey/medusa-sdk'

let collector: AnalyticsCollector | null = null

export function setCollector(c: AnalyticsCollector): void {
	collector = c
}

export function clearCollector(): void {
	collector = null
}

export function getCollector(): AnalyticsCollector | null {
	return collector
}
