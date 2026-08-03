import { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from '@medusajs/framework/http'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { asValue } from 'awilix'
import { AccessFieldFilter, ScopedFieldPath } from './access-field-filter'
import { getActorAuthenticators, resolveActorRoles } from './actor-resolvers'
import { PermissionAction, ScopeRequirement, authorize, markRequestScope } from './has-permission'
import { canonicalQueryRoot } from './query-roots'
import { isPathSealed, matchesPrefixOnSegmentBoundary, matchRoutePolicies, normalizePath, routeAssertsScopes } from './route-guards'
import { combineScopeFilters, mergeScopeFilter } from './scope-filters'
import { ACCESS_UNSCOPED_QUERY, AccessEnforcement, FieldPruner, createScopedQuery, enforcementSatisfied, resolveUnscopedQuery } from './scoped-query'
import { getScope } from './scopes'
import { alreadyWarned, markWarned } from './warn-once'

/** Recursively delete a dotted field path from an object/array tree. */
function deletePath(node: any, segments: string[]): void {
	if (node == null || typeof node !== 'object') {
		return
	}
	if (Array.isArray(node)) {
		for (const item of node) {
			deletePath(item, segments)
		}
		return
	}
	const [head, ...rest] = segments
	if (rest.length === 0) {
		delete node[head]
		return
	}
	deletePath(node[head], rest)
}

/**
 * Infer the response's entity key (e.g. `{ customer: … }` → "customer",
 * `{ customers: [], count }` → "customers"). `req.queryConfig.entity` is not
 * stored on the request, so we recover the entity from the response shape; the
 * joiner alias map resolves both singular and plural forms.
 */
function inferEntityKey(body: any): string | undefined {
	if (!body || typeof body !== 'object' || Array.isArray(body)) {
		return undefined
	}
	const metaKeys = new Set(['count', 'offset', 'limit'])
	for (const key of Object.keys(body)) {
		if (metaKeys.has(key)) {
			continue
		}
		const value = body[key]
		if (value && typeof value === 'object') {
			return key
		}
	}
	return undefined
}

/** Strip each not-allowed field path from every entity value in the response. */
function stripNotAllowedFields(body: any, notAllowed: string[]): void {
	if (!body || typeof body !== 'object') {
		return
	}
	for (const key of Object.keys(body)) {
		const value = body[key]
		if (value && typeof value === 'object') {
			for (const path of notAllowed) {
				deletePath(value, path.split('.'))
			}
		}
	}
}

/**
 * Always-on response field-filter. Wraps `res.json`; when it fires,
 * `req.queryConfig` (entity + resolved fields) is populated, so we compute which
 * requested fields resolve to entities the actor cannot `read` and strip them
 * from the response. This closes the link-expansion bypass (e.g. reading
 * complaints via `customer.complaints` without `complaint:read`).
 *
 * Field-gating follows automatically from the policy definitions: the filter
 * only restricts entities registered as policy resources; undefined resources
 * are left untouched.
 */
function installFieldFilter(
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse,
	roleIds: string[],
	policies: PermissionAction[],
	release: () => boolean
): void {
	const originalJson = res.json.bind(res)
	;(res as any).json = (body: any) => {
		if (!release()) {
			res.status(403)
			return originalJson({ type: 'forbidden', message: 'Insufficient permissions' })
		}

		const queryConfig = (req as any).queryConfig
		const fields: string[] | undefined = queryConfig?.fields
		const entity: string | undefined = queryConfig?.entity ?? inferEntityKey(body)

		if (!entity || !fields?.length || res.headersSent) {
			return originalJson(body)
		}

		// A non-empty `policies` enables filtering at all; the read checks use
		// `userRoles`, not this list.
		const filter = new AccessFieldFilter({ policies: policies as any, userRoles: roleIds, container: req.scope })

		filter
			.resolveFieldAccess({
				entity,
				parsedFields: { fields: new Set(fields), starFields: new Set() }
			})
			.then(async access => {
				if (access.notAllowed.length) {
					stripNotAllowedFields(body, access.notAllowed)
				}
				await narrowScopedRelations(req, body, access.scoped)
				originalJson(body)
			})
			.catch(error => {
				// fail-open: route-level enforcement still applied; a filter fault must
				// not brick the request. But this is now reachable from storefront
				// traffic too (the guard mounts on `/*`), so a persistent fault must
				// not be invisible — log it.
				warnFieldFilterFault(req.scope, entity, error)
				originalJson(body)
			})

		return res
	}
}

/**
 * Narrow a scoped relation inside a response.
 *
 * The row filter only reaches the query's root, so a relation the actor holds
 * only at a scope arrives whole: ask for `customers?fields=orders.*` while
 * holding `order:read@sales_channel` and every order of a visible customer
 * comes back, including ones in other channels.
 *
 * The scope predicate is evaluated by the database, not here — we collect the
 * ids the response already carries and ask which of them the scope admits.
 * That keeps a scope a query filter rather than a hand-rolled row test, works
 * for any filter shape `defineScope` can return, and needs nothing selected
 * beyond `id`.
 *
 * Fail-closed throughout: an unresolvable scope, a relation row with no `id`,
 * or a failed lookup drops the relation rather than showing rows we cannot
 * prove are in scope.
 */
async function narrowScopedRelations(req: AuthenticatedMedusaRequest, body: any, scoped: ScopedFieldPath[]): Promise<void> {
	const actorId = req.auth_context?.actor_id
	if (!actorId || !scoped.length) {
		return
	}
	const actor = { id: actorId, type: req.auth_context?.actor_type ?? 'user' }

	// Paths are relative to the entity, while the body is an envelope
	// (`{ customers: [...] }`) — descend into its values first, the same way the
	// response strip does.
	const entities = Object.values(body ?? {}).filter(value => value && typeof value === 'object')

	for (const entry of scoped) {
		const segments = entry.path.split('.')
		const rows = entities.flatMap(value => collectRelationRows(value, segments))
		if (!rows.length) {
			continue
		}

		const ids = rows.map(row => row?.id).filter(id => typeof id === 'string')
		if (ids.length !== rows.length) {
			for (const value of entities) {
				narrowPath(value, segments, undefined)
			}
			continue
		}

		let allowed: Set<string> | undefined
		try {
			allowed = await idsInScope(req, actor, entry, [...new Set(ids)])
		} catch (error) {
			logScopeResolutionFailure(req.scope, error)
			allowed = undefined
		}

		for (const value of entities) {
			narrowPath(value, segments, allowed)
		}
	}
}

/** Which of `ids` the actor's scopes on this resource actually admit. */
async function idsInScope(
	req: AuthenticatedMedusaRequest,
	actor: { id: string; type: string },
	entry: ScopedFieldPath,
	ids: string[]
): Promise<Set<string> | undefined> {
	const resolved: Record<string, unknown>[] = []
	for (const name of entry.scopes) {
		const scope = getScope(entry.resource, name)
		if (!scope) {
			return undefined
		}
		resolved.push(await scope(actor, req.scope))
	}
	if (!resolved.length) {
		return undefined
	}

	const merge = mergeScopeFilter({ id: ids }, combineScopeFilters(resolved))
	if (merge.kind === 'empty') {
		return new Set()
	}
	if (merge.kind === 'unmergeable') {
		return undefined
	}

	// The unscoped query deliberately: the filter above is the whole restriction,
	// and re-entering the interceptor here would filter our own lookup.
	const query = resolveUnscopedQuery(req.scope)
	const { data } = await query.graph({ entity: entry.resource, fields: ['id'], filters: merge.filters })
	return new Set((data ?? []).map((row: any) => row.id))
}

/** Every object sitting at `segments` in the response tree. */
function collectRelationRows(node: any, segments: string[], found: any[] = []): any[] {
	if (node == null || typeof node !== 'object') {
		return found
	}
	if (Array.isArray(node)) {
		for (const item of node) {
			collectRelationRows(item, segments, found)
		}
		return found
	}

	const [head, ...rest] = segments
	if (rest.length) {
		collectRelationRows(node[head], rest, found)
		return found
	}

	const relation = node[head]
	if (Array.isArray(relation)) {
		found.push(...relation)
	} else if (relation && typeof relation === 'object') {
		found.push(relation)
	}
	return found
}

/** Keep only the relation rows whose id is admitted; drop the relation entirely when `allowed` is unknown. */
function narrowPath(node: any, segments: string[], allowed: Set<string> | undefined): void {
	if (node == null || typeof node !== 'object') {
		return
	}
	if (Array.isArray(node)) {
		for (const item of node) {
			narrowPath(item, segments, allowed)
		}
		return
	}

	const [head, ...rest] = segments
	if (rest.length) {
		narrowPath(node[head], rest, allowed)
		return
	}

	const relation = node[head]
	if (relation == null) {
		return
	}
	if (!allowed) {
		delete node[head]
		return
	}

	if (Array.isArray(relation)) {
		node[head] = relation.filter(row => row && typeof row === 'object' && allowed.has(row.id))
		return
	}
	if (typeof relation === 'object' && !allowed.has(relation.id)) {
		delete node[head]
	}
}

/**
 * Pre-query field pruning: paths the actor has no read grant on are removed
 * from the selection before the query runs, so that data is never fetched
 * rather than fetched and stripped afterwards.
 *
 * The post-query strip still runs on the response — it is what covers a
 * response not built from the query layer, and a pruning fault.
 */
function makeFieldPruner(req: AuthenticatedMedusaRequest, roleIds: string[], policies: PermissionAction[]): FieldPruner {
	return async (root, fields) => {
		const filter = new AccessFieldFilter({ policies: policies as any, userRoles: roleIds, container: req.scope })

		const notAllowed = await filter.getNotAllowedFields({
			entity: root,
			parsedFields: { fields: new Set(fields), starFields: new Set() }
		})

		if (!notAllowed.length) {
			return fields
		}
		const dropped = new Set(notAllowed)
		return fields.filter(field => !dropped.has(field))
	}
}

/**
 * The ledger's release check, shared by every terminal response path. Answers
 * once: Express's `res.json` calls `res.send` internally, so a per-path check
 * would re-enter and try to deny a response it had already replaced.
 */
function makeEnforcementRelease(req: AuthenticatedMedusaRequest, res: MedusaResponse, enforcement?: AccessEnforcement): () => boolean {
	let answered = false

	return () => {
		if (answered || !enforcement) {
			return true
		}
		answered = true

		if (res.statusCode >= 400 || enforcementSatisfied(enforcement)) {
			return true
		}

		logScopeEnforcementGap(req, enforcement)
		return false
	}
}

/**
 * Extend the ledger's release rule to the non-JSON response paths, so a scoped
 * route answering with a string, a Buffer, a file, or a stream fails closed
 * rather than shipping unnarrowed. Field stripping stays on the JSON path
 * alone: these bodies have no entity shape to strip.
 */
function installNonJsonRelease(res: MedusaResponse, release: () => boolean): void {
	const forbidden = { type: 'forbidden', message: 'Insufficient permissions' }

	const originalSend = typeof (res as any).send === 'function' ? (res as any).send.bind(res) : undefined
	const originalWrite = typeof (res as any).write === 'function' ? (res as any).write.bind(res) : undefined
	const originalEnd = typeof (res as any).end === 'function' ? (res as any).end.bind(res) : undefined
	const originalWriteHead = typeof (res as any).writeHead === 'function' ? (res as any).writeHead.bind(res) : undefined

	// Ahead of `write`/`end`, because a handler that calls this has committed to
	// a status before producing a body — checking here is what keeps the denial a
	// clean 403 rather than a destroyed socket.
	if (originalWriteHead) {
		;(res as any).writeHead = (...args: any[]) => {
			if (release()) {
				return originalWriteHead(...args)
			}
			res.status(403)
			return originalWriteHead(403)
		}
	}

	if (originalSend) {
		;(res as any).send = (body: any) => {
			if (release()) {
				return originalSend(body)
			}
			res.status(403)
			return originalSend(forbidden)
		}
	}

	if (originalWrite) {
		;(res as any).write = (...args: any[]) => {
			if (release()) {
				return originalWrite(...args)
			}
			if (!res.headersSent) {
				res.status(403)
				return originalWrite(JSON.stringify(forbidden))
			}
			;(res as any).destroy?.()
			return false
		}
	}

	if (originalEnd) {
		;(res as any).end = (...args: any[]) => {
			if (release()) {
				return originalEnd(...args)
			}
			if (!res.headersSent) {
				res.status(403)
				return originalEnd(JSON.stringify(forbidden))
			}
			// The body is already on the wire; truncating it is the only remaining
			// way to avoid completing a response that was never narrowed.
			;(res as any).destroy?.()
			return res
		}
	}
}

/** Resolve the logger defensively — a container without one must not turn a warning into a 500. */
function warnFieldFilterFault(container: MedusaContainer, entity: string, error: unknown): void {
	try {
		const logger: any = container.resolve(ContainerRegistrationKeys.LOGGER)
		logger?.warn?.(
			`[access] field filter failed for entity "${entity}" — falling through with the response unfiltered: ${error instanceof Error ? error.message : String(error)}`
		)
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

/**
 * Fires only when a scoped route's handler neither queried nor asserted one of
 * its required resources — the response is about to be replaced with a 403
 * instead of leaking unfiltered rows. That is always a consumer-code bug (a
 * missing query or a missing `assertsScope` declaration), never a one-time
 * misconfiguration, so this logs at error level naming the route and the
 * resources that were left unnarrowed.
 */
function logScopeEnforcementGap(req: AuthenticatedMedusaRequest, enforcement: AccessEnforcement): void {
	try {
		const logger: any = req.scope.resolve(ContainerRegistrationKeys.LOGGER)
		const unnarrowed = [...enforcement.required].filter(resource => !enforcement.narrowed.has(resource) && !enforcement.asserted.has(resource))
		logger?.error?.(
			`[access] ${req.method} ${(req as any).originalUrl} completed without narrowing or asserting: ${unnarrowed.join(', ')} — replacing the response with 403 rather than leaking unfiltered rows. A scoped handler must query every required resource (so the interceptor can narrow it) or the route must declare assertsScope.`
		)
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

function warnUnresolvedActorType(container: MedusaContainer, actorType: string): void {
	if (alreadyWarned('actor-type', actorType)) {
		return
	}
	markWarned('actor-type', actorType)
	try {
		const logger: any = container.resolve(ContainerRegistrationKeys.LOGGER)
		logger?.warn?.(
			`[access] no role resolver registered for actor type "${actorType}" — requests from this actor type are denied on every declared route. Register one with registerActorResolver({ actorType, resolve }).`
		)
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

/**
 * A role grants a scoped permission (e.g. `customer:delete@company`) for
 * which no `defineScope` registration exists. {@link accessGuard} denies the
 * request rather than admit it unnarrowed. The 403 looks identical to a plain
 * permissions denial unless we say otherwise here, so an operator does not go
 * looking somewhere else for what is actually a missing `defineScope` call.
 */
function warnUnenforceableScope(container: MedusaContainer, scopes: ScopeRequirement[]): void {
	const unwarned = scopes.filter(s => !alreadyWarned('unenforceable-scope', `${s.resource}:${s.scope}`))
	if (!unwarned.length) {
		return
	}
	for (const s of unwarned) {
		markWarned('unenforceable-scope', `${s.resource}:${s.scope}`)
	}
	try {
		const logger: any = container.resolve(ContainerRegistrationKeys.LOGGER)
		for (const s of unwarned) {
			logger?.warn?.(
				`[access] scope "${s.resource}:${s.scope}" is granted by a role but has no matching defineScope registration — the query interceptor exists but cannot apply a filter that was never defined, so the request is denied rather than admitted unnarrowed.`
			)
		}
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

/**
 * A `defineScope` resource that is not itself a canonical query-root name
 * (e.g. registered under `widgets` when the entity's canonical name is
 * `widget`) can never be narrowed: {@link createScopedQuery} keys its filter
 * map by canonical name, so a filter registered under an alias sits unused
 * while the real root sails through unfiltered. This is the sibling of
 * {@link warnUnenforceableScope} for the case where the registration exists
 * but, because of the name it was registered under, can never take effect —
 * the guard denies rather than admit unnarrowed, same as that case.
 */
function warnNonCanonicalScope(container: MedusaContainer, scopes: ScopeRequirement[]): void {
	const unwarned = scopes.filter(s => !alreadyWarned('non-canonical-scope', `${s.resource}:${s.scope}`))
	if (!unwarned.length) {
		return
	}
	for (const s of unwarned) {
		markWarned('non-canonical-scope', `${s.resource}:${s.scope}`)
	}
	try {
		const logger: any = container.resolve(ContainerRegistrationKeys.LOGGER)
		for (const s of unwarned) {
			logger?.warn?.(
				`[access] scope "${s.resource}:${s.scope}" is registered under "${s.resource}", which is not a canonical query-root name — the interceptor keys row filters by canonical entity name, so this scope could never be narrowed. Register defineScope under the canonical resource name instead; the request is denied rather than admitted unnarrowed.`
			)
		}
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

/**
 * A scope's filter resolver threw, or resolved to a filter that would widen
 * access instead of narrowing it (an empty `{}` merges as "no filter"). Unlike
 * {@link warnUnenforceableScope} — a one-time configuration nudge — this logs
 * at error level on every occurrence: a failing or misbehaving resolver is an
 * outage signal, not something to note once and move on from.
 */
function logScopeResolutionFailure(container: MedusaContainer, error: unknown): void {
	try {
		const logger: any = container.resolve(ContainerRegistrationKeys.LOGGER)
		logger?.error?.(
			`[access] scope filter resolution failed — the request is denied rather than admitted unnarrowed: ${error instanceof Error ? error.message : String(error)}`
		)
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

/** HEAD is already normalized to GET by `matchRoutePolicies` / `routeAssertsScopes`. */
const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

/**
 * Run an Express-style middleware and resolve once it calls `next()`, or
 * reject with whatever it passes to `next(err)`. The guard mounts ahead of
 * every plugin's own routes (`RoutesSorter` emits a node's own routes before
 * recursing into children), so a plugin's `authenticate('affiliate', …)`
 * middleware mounted at `/affiliate/*` can never run before the guard on its
 * own — the guard has to invoke it directly, and awaiting it here is what
 * lets that invocation join the guard's normal control flow (including the
 * outer `catch` turning a rejection into `next(error)`).
 */
function runAuthenticator(
	authenticate: (req: any, res: any, next: (err?: unknown) => void) => void,
	req: AuthenticatedMedusaRequest,
	res: MedusaResponse
): Promise<void> {
	return new Promise((resolve, reject) => {
		let settled = false
		const settle = (fn: () => void) => {
			if (settled) {
				return
			}
			settled = true
			fn()
		}

		// Medusa's own `authenticate()` factory — the natural value to pass here —
		// ends an unauthenticated request itself (`res.status(401).json(...)`)
		// without ever calling `next`. `res` is an Express response, an
		// EventEmitter that fires `finish` once the response has been sent, so
		// that is the second way this promise can settle; without it, an
		// authenticator that never calls `next` would leave this promise (and the
		// guard's handler) pending forever.
		;(res as any).once?.('finish', () => settle(resolve))
		// `close` fires after `finish` on the happy path (no-op here, `settle` is
		// idempotent) but ALSO fires on its own when the client aborts the
		// connection before the response finishes flushing — the socket is
		// destroyed, `finish` never fires, and without this listener the promise
		// would hang exactly like the case above, just in a narrower window.
		;(res as any).once?.('close', () => settle(resolve))

		authenticate(req, res, err => settle(() => (err ? reject(err) : resolve())))
	})
}

/**
 * Run the first registered actor authenticator whose declared prefixes match
 * `fullPath`, but only when nothing has authenticated the request yet —
 * running one unconditionally would let it clobber `auth_context` core or an
 * earlier plugin already populated.
 */
async function runMatchingActorAuthenticator(fullPath: string, req: AuthenticatedMedusaRequest, res: MedusaResponse): Promise<void> {
	if (req.auth_context?.actor_id) {
		return
	}
	const candidate = normalizePath(fullPath)
	const match = getActorAuthenticators().find(({ prefixes }) => prefixes.some(prefix => matchesPrefixOnSegmentBoundary(candidate, normalizePath(prefix))))
	if (match) {
		await runAuthenticator(match.authenticate, req, res)
	}
}

/**
 * Global `/*` guard. Runs on every request the app serves. Enforces
 * route-level policies (resolving the actor's roles from the `access_roles`
 * link, not the JWT), then installs the response field-filter. Active
 * whenever the plugin is loaded (module presence is the gate — no feature
 * flag). Routes with no registered policies pass through unless their
 * namespace is sealed.
 */
export async function accessGuard(req: AuthenticatedMedusaRequest, res: MedusaResponse, next: MedusaNextFunction): Promise<void> {
	try {
		// Mounted at `/*`, so `req.path` is always just '/' — it reflects position
		// within this single top-level route, not the request's real path. Read
		// `req.originalUrl` directly rather than falling back to `req.path`: a
		// fallback could only ever produce a path that matches no guard (a silent
		// fail-open) or, under a root seal, one that matches everything (denying
		// every request). If `originalUrl` were ever absent, the throw below is
		// caught by the outer catch and becomes a 500 — fail-closed, correctly.
		const fullPath = (req as any).originalUrl.split('?')[0]
		const required = matchRoutePolicies(fullPath, req.method)
		if (!required.length) {
			// Fail-open is the global default: third-party routes cannot be assumed
			// access-aware. A namespace its owner has explicitly sealed is the
			// exception — there, an undeclared route is a mistake, not an opt-out.
			if (isPathSealed(fullPath)) {
				throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
			}

			// Memoization only — it changes nothing an undeclared route can observe.
			// `runMatchingActorAuthenticator` deliberately does NOT move up here:
			// running an authenticator could end a request the app would otherwise
			// have served, which is the behaviour change fail-open exists to prevent.
			if (req.auth_context?.actor_id) {
				markRequestScope(req.scope)
			}

			return next()
		}

		await runMatchingActorAuthenticator(fullPath, req, res)
		if (res.headersSent) {
			// Medusa's own `authenticate()` factory — the natural value to pass as
			// `authenticate` — ends the response itself (`res.status(401).json(...)`)
			// without ever calling `next` on an unauthenticated request. The guard's
			// job is done: it must not call `next()` again (Express throws on a
			// second call after headers are sent) and must not fall through to the
			// actor-id check below.
			return
		}

		// A client that aborted before we got here has no response to receive
		// anything, so resolving its roles is a database round-trip spent on a
		// destroyed socket. Nothing downstream can run either — not calling
		// `next()` is the point, and is safe because `destroyed` is only true
		// once the socket is gone for good.
		if ((res as any).destroyed) {
			return
		}

		const actorId = req.auth_context?.actor_id
		const actorType = req.auth_context?.actor_type

		if (!actorId) {
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Forbidden')
		}

		// Opt this request's scope into memoized role resolution. Everything
		// downstream that resolves permissions — this guard, the response field
		// filter, workflow steps invoked with req.scope — then shares one lookup
		// per role for the life of the request, with no staleness window.
		markRequestScope(req.scope)

		const roleIds = await resolveActorRoles(actorType ?? 'user', actorId, req.scope)

		if (roleIds === null) {
			warnUnresolvedActorType(req.scope, actorType ?? 'user')
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
		}

		const decision = await authorize({
			roles: roleIds,
			actions: required,
			container: req.scope
		})

		if (!decision.granted) {
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
		}

		let enforcement: AccessEnforcement | undefined

		if (decision.scopes.length) {
			const missing = decision.scopes.filter(s => !getScope(s.resource, s.scope))
			if (missing.length) {
				warnUnenforceableScope(req.scope, missing)
				throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
			}

			// A scope registered under a non-canonical resource name (e.g. `widgets`
			// for the canonical entity `widget`) can never be narrowed — the
			// interceptor keys filters by canonical name — so it is as unenforceable
			// as a missing registration and denied for the same reason.
			const nonCanonical = decision.scopes.filter(s => canonicalQueryRoot(s.resource) !== s.resource)
			if (nonCanonical.length) {
				warnNonCanonicalScope(req.scope, nonCanonical)
				throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
			}

			// authorize() flattens per-operation scope sets into one set per resource.
			// When a route requires two different operations on the same scoped
			// resource, OR-combining those sets would widen access (A∪B rows instead
			// of A∩B), so that shape denies until a real route needs it.
			const scopedResources = new Set(decision.scopes.map(s => s.resource))
			const operationsPerResource = new Map<string, Set<string>>()
			for (const action of required) {
				const ops = Array.isArray(action.operation) ? action.operation : [action.operation]
				const set = operationsPerResource.get(action.resource) ?? new Set()
				ops.forEach(op => set.add(op))
				operationsPerResource.set(action.resource, set)
			}
			for (const resource of scopedResources) {
				if ((operationsPerResource.get(resource)?.size ?? 0) > 1) {
					throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
				}
			}

			if (MUTATING_METHODS.has(req.method.toUpperCase()) && !routeAssertsScopes(fullPath, req.method)) {
				throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
			}

			// Eager resolution runs before `req.scope.register` below, so every scope
			// filter resolver always sees the unwrapped (unscoped) query.
			const actor = { id: actorId, type: actorType ?? 'user' }
			const byResource = new Map<string, Record<string, unknown>[]>()
			try {
				for (const requirement of decision.scopes) {
					const filter = await getScope(requirement.resource, requirement.scope)!(actor, req.scope)
					const list = byResource.get(requirement.resource) ?? []
					list.push(filter)
					byResource.set(requirement.resource, list)
				}
			} catch (error) {
				logScopeResolutionFailure(req.scope, error)
				throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
			}

			// Checked before combining, and outside the try above: an empty `{}`
			// merges as "no filter" downstream, which would mark the resource
			// narrowed while narrowing nothing at all — silent widening, not a
			// resolver crash, so it gets its own denial rather than folding into the
			// generic resolver-threw catch (which would also double-log this one).
			const filtersByResource = new Map<string, Record<string, unknown>>()
			for (const [resource, resolved] of byResource) {
				for (const filter of resolved) {
					if (!filter || typeof filter !== 'object' || !Object.keys(filter).length) {
						logScopeResolutionFailure(
							req.scope,
							new Error(`scope filter for "${resource}" did not resolve to a non-empty filter object, which would widen access instead of narrowing it`)
						)
						throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
					}
				}
				filtersByResource.set(resource, combineScopeFilters(resolved))
			}

			enforcement = { required: new Set(filtersByResource.keys()), narrowed: new Set(), asserted: new Set() }
			const original = req.scope.resolve(ContainerRegistrationKeys.QUERY)
			const scopedQuery = createScopedQuery({
				original,
				filters: filtersByResource,
				enforcement,
				pruneFields: makeFieldPruner(req, roleIds, required)
			})
			req.scope.register({
				[ContainerRegistrationKeys.QUERY]: asValue(scopedQuery),
				[ContainerRegistrationKeys.REMOTE_QUERY]: asValue(scopedQuery),
				[ACCESS_UNSCOPED_QUERY]: asValue(original)
			})
			;(req as any).accessEnforcement = enforcement
		}

		// Set only on the granted path: `[]` means evaluated with nothing to narrow,
		// non-empty means admitted with `req.accessEnforcement` as its ledger, and
		// `undefined` means never evaluated (undeclared route).
		;(req as any).accessScopes = decision.scopes

		const release = makeEnforcementRelease(req, res, enforcement)
		installFieldFilter(req, res, roleIds, required, release)
		if (enforcement) {
			installNonJsonRelease(res, release)
		}

		return next()
	} catch (error) {
		return next(error)
	}
}
