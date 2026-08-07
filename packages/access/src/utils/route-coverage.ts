import { ApiLoader } from '@medusajs/framework/http'
import { CLOSED_OPERATIONS, DiscardedPolicy, listDiscardedPolicies, PolicyResource } from './define-policies'
import { canonicalQueryRoot } from './query-roots'
import { findGuardsRequiring, listGuardResources, listRouteGuards, matchesPrefixOnSegmentBoundary, matchRoutePolicies, normalizePath } from './route-guards'
import { listTenancies } from './tenancy'

export type RegisteredRoute = {
	matcher: string
	method: string
}

export type RouteCoverage = {
	total: number
	covered: number
	uncovered: RegisteredRoute[]
}

declare global {
	// eslint-disable-next-line no-var
	var AccessRegisteredRoutes: RegisteredRoute[] | undefined
	// eslint-disable-next-line no-var
	var AccessRouteRegistryInstalled: boolean | undefined
}

global.AccessRegisteredRoutes ??= []

/**
 * Record every route the app registers, so coverage can be reported at boot.
 *
 * `ApiLoader.traceRoute` is the only hook that sees every route — core's, every
 * plugin's, and the project's — at registration time, which a `/*` guard
 * middleware cannot do (it only ever sees routes that are actually requested).
 *
 * Caveats this deliberately accepts:
 *  - The slot is semantically for tracing and is undocumented for this use, so
 *    we chain `prev` rather than overwrite. OTEL installs first
 *    (`registerInstrumentation` runs before `loaders`), and any other plugin
 *    doing the same must also chain.
 *  - Guarded for idempotence because HMR re-invokes `apiLoader.load()`, which
 *    would otherwise stack wrappers on every reload.
 *
 * Must be called before routes register. A plugin's `api/middlewares.ts` module
 * body runs during the scan phase, which completes before any registration.
 */
export function installRouteRegistry(): void {
	if (global.AccessRouteRegistryInstalled) {
		return
	}
	global.AccessRouteRegistryInstalled = true

	const prev = ApiLoader.traceRoute

	ApiLoader.traceRoute = (handler, route) => {
		global.AccessRegisteredRoutes!.push({ matcher: String(route.route), method: route.method })

		return prev ? prev(handler, route) : handler
	}
}

/**
 * Replace `:param` segments with a concrete probe value so a route *pattern*
 * can be tested against the guard registry, which matches request *paths*.
 */
function toProbePath(matcher: string): string {
	// Normalized the same way the guard normalizes a request path. Without it a
	// route registered as `/admin/widgets/` probes as a string the anchored
	// matcher `/admin/widgets` cannot match, and the report fabricates a finding
	// (uncovered here, stale in `getStaleGuards`) out of a trailing slash.
	return normalizePath(matcher.replace(/:[A-Za-z0-9_]+/g, '__probe__'))
}

/**
 * Which registered routes under `prefix` have no matching policy declaration.
 *
 * Advisory, not enforcement — undeclared routes still pass unless their
 * namespace is sealed. This is the report you run *before* sealing, to see what
 * sealing would break.
 */
export function getRouteCoverage(prefix = '/admin'): RouteCoverage {
	const seen = new Set<string>()
	const uncovered: RegisteredRoute[] = []
	let total = 0

	for (const route of global.AccessRegisteredRoutes ?? []) {
		if (!matchesPrefixOnSegmentBoundary(route.matcher, prefix)) {
			continue
		}

		// HMR re-runs registration, so the raw list can hold duplicates.
		const key = `${route.method} ${route.matcher}`
		if (seen.has(key)) {
			continue
		}
		seen.add(key)
		total++

		if (!matchRoutePolicies(toProbePath(route.matcher), route.method).length) {
			uncovered.push(route)
		}
	}

	return { total, covered: total - uncovered.length, uncovered }
}

/**
 * Guards that match no route the app actually registered.
 *
 * These are declarations that have rotted — a route renamed or removed upstream,
 * or a matcher that never matched anything. They are silent by nature: a guard
 * for a path that does not exist simply never fires, so nothing surfaces until
 * someone audits by hand. (The pinned core-route map has produced exactly this:
 * an earlier audit found 22 `/admin/rbac/**` matchers left over from the fork
 * origin, guarding paths this plugin never serves.)
 *
 * Wildcard guards are included: a `/prefix/*` that matches nothing is as stale
 * as a literal one.
 */
export function getStaleGuards(prefix = '/admin'): { matcher: string; methods: string[] }[] {
	const routes = (global.AccessRegisteredRoutes ?? []).map(route => ({
		probe: toProbePath(route.matcher),
		method: route.method
	}))

	if (!routes.length) {
		return []
	}

	return (
		listRouteGuards()
			.filter(guard => matchesPrefixOnSegmentBoundary(guard.matcher, prefix))
			// `guardResource` emits a full CRUD surface deliberately and the pinned
			// core map is an upstream snapshot spanning more than one Medusa
			// version, so unmatched entries from either are protective (a route
			// added later is already covered), not rotted. Only hand-written
			// declarations are evidence of drift.
			.filter(guard => guard.source === 'explicit')
			.filter(guard => !routes.some(route => guard.methods.includes(route.method) && guard.regex.test(route.probe)))
			.map(({ matcher, methods }) => ({ matcher, methods }))
	)
}

/**
 * Log a one-line coverage summary, plus the uncovered routes at debug level.
 * Called on application start; silent when everything is covered.
 */
export function reportRouteCoverage(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	const declaredPrefixes = new Set<string>()
	for (const guard of listRouteGuards()) {
		const segment = guard.matcher.split('/')[1]
		if (segment && !segment.includes('*') && !segment.startsWith(':')) {
			declaredPrefixes.add(`/${segment}`)
		}
	}

	for (const prefix of [...declaredPrefixes].sort()) {
		const { total, covered, uncovered } = getRouteCoverage(prefix)

		if (total) {
			if (!uncovered.length) {
				logger.info?.(`[access] route coverage: ${covered}/${total} ${prefix} routes declared`)
			} else {
				logger.warn?.(`[access] route coverage: ${covered}/${total} ${prefix} routes declared — ${uncovered.length} undeclared (these pass unguarded)`)
				for (const route of uncovered) {
					logger.debug?.(`[access]   undeclared: ${route.method} ${route.matcher}`)
				}
			}
		}

		// Drift is reported regardless of coverage — and regardless of whether this
		// prefix has any registered routes at all. These are independent signals:
		// coverage asks "is every route declared", drift asks "does every
		// declaration still point at a route". A prefix with zero routes is the
		// most extreme case of drift (100% of its declarations are rotted), and
		// gating this on `total` silenced exactly that case, along with the
		// fully-covered-but-still-rotted case.
		const stale = getStaleGuards(prefix)
		if (stale.length) {
			logger.warn?.(`[access] ${stale.length} policy declaration(s) under ${prefix} match no registered route — likely rotted`)
			for (const guard of stale) {
				logger.debug?.(`[access]   stale: ${guard.methods.join(',')} ${guard.matcher}`)
			}
		}
	}
}

/**
 * The exact mutating surface that stays closed to tenancy-scoped actors:
 * core-map declarations with a mutating method but neither `assertsScope`
 * (no core handler calls `assertScope`) nor a derived `target` (the generator
 * could not bind the path param to the policy resource). Unscoped actors are
 * unaffected. Info-level: this is an expected property of the installed core
 * version, not a fault — but an operator scoping actors deserves the list.
 */
export function reportScopedMutationClosure(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])
	const closed = listRouteGuards().filter(
		guard => guard.source === 'core-map' && !guard.assertsScope && !guard.target && guard.methods.some(method => MUTATING.has(method))
	)

	if (!closed.length) {
		return
	}

	logger.info?.(
		`[access] ${closed.length} core mutating route declaration(s) carry no row target — tenancy-scoped actors are denied on them (unscoped actors unaffected)`
	)
	for (const guard of closed) {
		logger.debug?.(`[access]   closed to scoped actors: ${guard.methods.join(',')} ${guard.matcher}`)
	}
}

/**
 * A tenancy dimension covering a resource under a non-canonical query-root
 * name can never narrow it — the interceptor keys row filters by canonical
 * name — so scoped holders are denied on it while the coverage LOOKS declared.
 * The same trap `warnNonCanonicalScope` names at request time, caught at boot.
 */
export function reportTenancyCoverage(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	for (const { type, resources } of listTenancies()) {
		const nonCanonical = resources.filter(resource => canonicalQueryRoot(resource) !== resource)
		if (nonCanonical.length) {
			logger.warn?.(
				`[access] tenancy "${type}" covers non-canonical resource name(s): ${nonCanonical.join(', ')} — their filters can never apply, so scoped holders are denied on them. Use the canonical query-root names.`
			)
		}
	}
}

/**
 * Every route whose declaration requires a grant that was discarded.
 *
 * Matched against both the operation as written and its normalized form: the
 * policy registry normalizes (`approveOrder` → `approve_order`) but a route
 * declaration is a hand-written literal, so the two can legitimately differ.
 */
function routesStrandedBy(discarded: DiscardedPolicy): { matcher: string; methods: string[] }[] {
	const separator = discarded.key.lastIndexOf(':')
	const resources = new Set([discarded.resource, discarded.key.slice(0, separator)])
	const operations = new Set([discarded.operation, discarded.key.slice(separator + 1)])

	const found = new Map<string, { matcher: string; methods: string[] }>()
	for (const resource of resources) {
		for (const operation of operations) {
			for (const guard of findGuardsRequiring(resource, operation)) {
				found.set(`${guard.methods.join(',')} ${guard.matcher}`, guard)
			}
		}
	}
	return [...found.values()]
}

/**
 * Report policies refused registration. Called on application start; silent when
 * there are none.
 *
 * Detail lines are `warn`, not `debug` as the coverage report uses: that list
 * can run to dozens of core routes, whereas every line here is a declaration
 * bug someone has to fix.
 *
 * The failure this exists to prevent is a silent one. A discarded policy is a
 * grant no role can hold, so a route requiring it denies everyone but a
 * wildcard holder — which presents as "permissions are broken on this route",
 * not as "someone typed `updte`". Naming the stranded routes is what closes
 * that gap, so the report leads with them rather than with the policy alone.
 *
 * The reason rides on each line rather than on the summary, because the two
 * cases need different advice: an out-of-set operation needs the closed set to
 * compare against, an incomplete declaration needs to be told which field is
 * missing.
 */
export function reportDiscardedPolicies(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	const discarded = listDiscardedPolicies()
	if (!discarded.length) {
		return
	}

	logger.warn?.(`[access] ${discarded.length} policy declaration(s) discarded — not registered, so no role can hold them`)

	for (const policy of discarded) {
		const origin = policy.declaredIn ? `, declared in ${policy.declaredIn}` : ''

		if (policy.reason === 'incomplete') {
			const missing = [!policy.name && 'name', !policy.resource && 'resource', !policy.operation && 'operation'].filter(Boolean).join(', ')
			logger.warn?.(
				`[access]   discarded: ${policy.key} (policy "${policy.name}"${origin}) — missing ${missing}. A policy definition needs all three; nothing was registered for it.`
			)
		} else {
			logger.warn?.(
				`[access]   discarded: ${policy.key} (policy "${policy.name}"${origin}) — operation is outside the closed set (${CLOSED_OPERATIONS.join(', ')}). Domain verbs such as approve or publish are modelled as update.`
			)
		}

		const stranded = routesStrandedBy(policy)
		if (!stranded.length) {
			logger.warn?.('[access]     required by: no route — nothing is denied by this until a declaration references it')
			continue
		}
		for (const route of stranded) {
			logger.warn?.(`[access]     required by: ${route.methods.join(',')} ${route.matcher} — which now denies every actor without a wildcard grant`)
		}
	}
}

export type UnregisteredGuardResource = {
	resource: string
	/** Declarations naming it, exactly as written. */
	guards: { matcher: string; methods: string[] }[]
	/** Whether any route the app registered is matched by one of those declarations. */
	live: boolean
}

/**
 * Resources a route declaration requires that no `definePolicies` call ever
 * registered.
 *
 * The mirror image of {@link getUnregisteredGuardResources}'s sibling
 * {@link reportDiscardedPolicies}: there a policy was written and refused, here
 * it was never written at all. Both end in the same place — no policy row, so no
 * role can hold the grant, so the route admits wildcard holders only — but only
 * the discarded case has anything on a rejected list to report from. This closes
 * the other half by joining the guard registry to the policy registry.
 *
 * `live` separates urgency from latency. A declaration matching a route the app
 * actually serves is broken right now; one matching nothing (the pinned core map
 * spans a `^2.18.0` peer range, so it declares routes the installed version may
 * not expose) is a latent bug worth fixing before that route appears.
 */
export function getUnregisteredGuardResources(): UnregisteredGuardResource[] {
	const routes = (global.AccessRegisteredRoutes ?? []).map(route => ({
		probe: toProbePath(route.matcher),
		method: route.method
	}))

	return listGuardResources()
		.filter(({ resource }) => !PolicyResource[resource])
		.map(({ resource, guards }) => ({
			resource,
			guards: guards.map(({ matcher, methods }) => ({ matcher, methods })),
			live: guards.some(guard => routes.some(route => guard.methods.includes(route.method) && guard.regex.test(route.probe)))
		}))
		.sort((a, b) => a.resource.localeCompare(b.resource))
}

/**
 * Report resources a declaration requires but nothing registered. Called on
 * application start; silent when there are none.
 *
 * `warn` throughout, like {@link reportDiscardedPolicies} and unlike the
 * coverage report: every line is a declaration bug someone has to fix, and the
 * list is short by nature.
 */
export function reportUnregisteredGuardResources(logger: { info?: Function; warn?: Function; debug?: Function } = console): void {
	const unregistered = getUnregisteredGuardResources()
	if (!unregistered.length) {
		return
	}

	logger.warn?.(
		`[access] ${unregistered.length} resource(s) named by a route declaration have no registered policy — declare them with definePolicies(generateResourcePolicies([...])), or the routes below admit wildcard (*:*) holders only`
	)

	for (const { resource, guards, live } of unregistered) {
		const consequence = live
			? 'and a registered route matches, so it denies every actor without a wildcard grant today'
			: 'though no registered route matches it yet, so nothing is denied until one appears'
		logger.warn?.(`[access]   unregistered: ${resource} — no policy declares this resource, ${consequence}`)

		for (const guard of guards) {
			logger.warn?.(`[access]     required by: ${guard.methods.join(',')} ${guard.matcher}`)
		}
	}
}
