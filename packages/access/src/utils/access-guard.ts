import { AuthenticatedMedusaRequest, MedusaNextFunction, MedusaResponse } from '@medusajs/framework/http'
import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { AccessFieldFilter } from './access-field-filter'
import { getActorAuthenticators, resolveActorRoles } from './actor-resolvers'
import { PermissionAction, ScopeRequirement, authorize, markRequestScope } from './has-permission'
import { isPathSealed, matchesPrefixOnSegmentBoundary, matchRoutePolicies, normalizePath } from './route-guards'

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
function installFieldFilter(req: AuthenticatedMedusaRequest, res: MedusaResponse, roleIds: string[], policies: PermissionAction[]): void {
	const originalJson = res.json.bind(res)
	;(res as any).json = (body: any) => {
		const queryConfig = (req as any).queryConfig
		const fields: string[] | undefined = queryConfig?.fields
		const entity: string | undefined = queryConfig?.entity ?? inferEntityKey(body)

		if (!entity || !fields?.length || res.headersSent) {
			return originalJson(body)
		}

		const filter = new AccessFieldFilter({
			// only used as a "should filter" flag (non-empty); actual checks use roles
			policies: policies as any,
			userRoles: roleIds,
			container: req.scope
		})

		filter
			.getNotAllowedFields({
				entity,
				parsedFields: { fields: new Set(fields), starFields: new Set() }
			})
			.then(notAllowed => {
				if (notAllowed.length) {
					stripNotAllowedFields(body, notAllowed)
				}
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

const warnedActorTypes = new Set<string>()

function warnUnresolvedActorType(container: MedusaContainer, actorType: string): void {
	if (warnedActorTypes.has(actorType)) {
		return
	}
	warnedActorTypes.add(actorType)
	try {
		const logger: any = container.resolve(ContainerRegistrationKeys.LOGGER)
		logger?.warn?.(
			`[access] no role resolver registered for actor type "${actorType}" — requests from this actor type are denied on every declared route. Register one with registerActorResolver({ actorType, resolve }).`
		)
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

const warnedUnenforceableScopes = new Set<string>()

/**
 * A role grants a scoped permission (e.g. `customer:delete@company`). The
 * guard denies whenever any scope is required — see {@link accessGuard} — not
 * because the scope is misconfigured, but because no query interceptor exists
 * yet to apply the filter a `defineScope` registration describes. The 403
 * looks identical to a plain permissions denial unless we say otherwise here,
 * so an operator does not go looking for a missing `defineScope` call that
 * would not change anything.
 */
function warnUnenforceableScope(container: MedusaContainer, scopes: ScopeRequirement[]): void {
	const unwarned = scopes.filter(s => !warnedUnenforceableScopes.has(`${s.resource}:${s.scope}`))
	if (!unwarned.length) {
		return
	}
	for (const s of unwarned) {
		warnedUnenforceableScopes.add(`${s.resource}:${s.scope}`)
	}
	try {
		const logger: any = container.resolve(ContainerRegistrationKeys.LOGGER)
		for (const s of unwarned) {
			logger?.warn?.(
				`[access] scope "${s.resource}:${s.scope}" is granted by a role but scoped grants are not yet enforceable — no query interceptor exists to apply the filter, so the request is denied rather than admitted unnarrowed.`
			)
		}
	} catch {
		// A container without a logger is not a reason to fail the request.
	}
}

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

		// No query interceptor exists yet, so nothing narrows rows. Admitting a scoped
		// actor would make every scoped grant behave as unrestricted — registering a
		// defineScope filter records intent for the future interceptor, it does not
		// make the scope enforceable today. Deny whenever ANY scope is required.
		if (decision.scopes.length) {
			warnUnenforceableScope(req.scope, decision.scopes)
			throw new MedusaError(MedusaError.Types.FORBIDDEN, 'Insufficient permissions')
		}

		// `req.accessScopes` is only ever set here, on the checked-and-unrestricted
		// path. `[]` means "the guard evaluated this request and found nothing to
		// narrow"; `undefined` means "the guard never evaluated it" (undeclared
		// route). A future query interceptor needs that distinction, not just the
		// contents of the array.
		;(req as any).accessScopes = decision.scopes

		installFieldFilter(req, res, roleIds, required)

		return next()
	} catch (error) {
		return next(error)
	}
}
