// Pure collection math for the Reviews components. No Svelte, unit-testable.
// Presentational star/date math (`averageToStarFills`/`ratingToStarFills`/`formatReviewDate`)
// moved to the dependency-free `review/` atom — see `review/review-logic.ts`.

/** Fraction 0–1 of a histogram bar; 0 when there are no reviews. */
export function barFill(count: number, total: number): number {
	return total > 0 ? count / total : 0
}

/** Number of pages for a review count at a given page size. */
export function pageCount(count: number, pageSize: number): number {
	return pageSize > 0 ? Math.ceil((count || 0) / pageSize) : 0
}
