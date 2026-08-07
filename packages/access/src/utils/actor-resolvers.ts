import { MedusaContainer } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import type { RequestHandler } from 'express'
import { normalizePath } from './route-guards'
import { resolveUnscopedQuery } from './scoped-query'
import { rearmWarnings } from './warn-once'

/**
 * Legacy escape hatch: bespoke role resolution returning role ids. The ids are
 * treated as UNSCOPED holdings. Prefer grantee paths — computed roles cannot
 * carry a scope and cannot be audited or revoked as rows; see the collision
 * note on {@link resolveActorHoldings}.
 */
export type ActorRoleResolver = (actorId: string, container: MedusaContainer) => Promise<string[]>

/**
 * A path from an actor to a non-actor entity that can hold role assignments
 * on the actor's behalf. `entity` is the Query entity name assignments
 * reference in `grantee_type`; `path` is the `query.graph` field path from the
 * actor row to that entity's id (`'groups.id'`, `'company.id'`).
 */
export type GranteePath = { entity: string; path: string }

/**
 * One resolved role holding. `scope` null means the role applies everywhere
 * (an unscoped assignment, or a legacy resolver result); set, it pins the
 * holding to a tenancy dimension value.
 */
export type ActorHolding = { role_id: string; scope: { type: string; id: string } | null }

type ActorAuthenticator = { authenticate: RequestHandler; prefixes: string[] }

declare global {
	// eslint-disable-next-line no-var
	var AccessActorResolvers: Map<string, ActorRoleResolver> | undefined
	// eslint-disable-next-line no-var
	var AccessActorAuthenticators: Map<string, ActorAuthenticator> | undefined
	// eslint-disable-next-line no-var
	var AccessActorEntities: Map<string, string> | undefined
	// eslint-disable-next-line no-var
	var AccessActorGrantees: Map<string, GranteePath[]> | undefined
}

global.AccessActorResolvers ??= new Map()
global.AccessActorAuthenticators ??= new Map()
global.AccessActorEntities ??= new Map()
global.AccessActorGrantees ??= new Map()

/**
 * Teach the guard how to resolve an actor type's role holdings.
 *
 * Registering establishes the type's IDENTITY grantee — assignments with
 * `grantee_type` equal to `entity` (default: the actor type) and `grantee_id`
 * equal to the acting actor's id resolve automatically. `grantees` adds
 * indirection paths (membership walks); `resolve` is the legacy escape hatch
 * for computed roles, unioned with assignment-based holdings when both are
 * supplied.
 *
 * Registering an `actorType` that is already registered throws: `user`,
 * `customer`, and `api-key` are reserved by this plugin's built-ins, and a
 * silent replacement of any actor type's resolution — reserved or not — is
 * almost certainly a mistake rather than an intentional override. There is no
 * override flag; WHO resolves an actor type is closed. What an actor type can
 * inherit THROUGH is open — see {@link registerGranteePath}, which is additive
 * and allowed on built-ins.
 *
 * `authenticate` and `prefixes` are a pair: an authenticator with no declared
 * prefixes would run on every unauthenticated request regardless of actor
 * type, and prefixes with nothing to authenticate declare a surface nothing
 * can ever populate `auth_context` for. Supplying only one is rejected.
 *
 * `prefixes` must be non-empty and must not contain the root (`/` or `''`),
 * for the same reason `sealNamespace` rejects it: a root prefix matches every
 * path, so the authenticator would run on every guarded request regardless of
 * actor type — exactly what pairing it with `prefixes` exists to prevent. An
 * empty array is rejected too, since it declares an authenticator that can
 * never run. `/admin` and `/store` are also rejected: core already
 * authenticates those surfaces, and a plugin's authenticator running there
 * could reject guest traffic on a guarded `/store` route.
 *
 * When multiple registrations declare overlapping prefixes (e.g. `/affiliate`
 * and `/affiliate/admin`), the guard runs whichever was registered first for
 * a given request — deterministic per boot, but dependent on plugin load
 * order across environments. Avoid overlapping `prefixes` across plugins.
 */
export function registerActorResolver(input: {
	actorType: string
	entity?: string
	grantees?: GranteePath[]
	resolve?: ActorRoleResolver
	authenticate?: RequestHandler
	prefixes?: string[]
}): void {
	const { actorType, entity, grantees, resolve, authenticate, prefixes } = input

	if (authenticate && !prefixes) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`registerActorResolver: "${actorType}" supplied "authenticate" without "prefixes" — both or neither are required.`
		)
	}
	if (prefixes && !authenticate) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`registerActorResolver: "${actorType}" supplied "prefixes" without "authenticate" — both or neither are required.`
		)
	}
	if (prefixes) {
		if (!prefixes.length) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`registerActorResolver: "${actorType}" supplied an empty "prefixes" array — its authenticator could never run. Declare the paths the actor type owns, such as /affiliate.`
			)
		}
		for (const prefix of prefixes) {
			const normalized = normalizePath(prefix)
			if (normalized === '' || normalized === '/') {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`registerActorResolver: "${actorType}" declared the root prefix "${prefix}" — it matches every path, so the authenticator would run on every guarded request. Declare the paths the actor type owns, such as /affiliate.`
				)
			}
			const lowered = normalized.toLowerCase()
			if (lowered === '/admin' || lowered === '/store') {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`registerActorResolver: "${actorType}" declared the reserved prefix "${prefix}" — core already authenticates /admin and /store, and an authenticator there could reject traffic those surfaces allow. Declare a prefix the actor type owns, such as /affiliate.`
				)
			}
		}
	}
	if (global.AccessActorEntities!.has(actorType) || global.AccessActorResolvers!.has(actorType)) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, `registerActorResolver: "${actorType}" is already registered — refusing to replace it.`)
	}

	global.AccessActorEntities!.set(actorType, entity ?? actorType)
	if (resolve) {
		global.AccessActorResolvers!.set(actorType, resolve)
	}
	for (const grantee of grantees ?? []) {
		registerGranteePath(actorType, grantee)
	}

	if (authenticate && prefixes) {
		global.AccessActorAuthenticators!.set(actorType, { authenticate, prefixes })
	}

	// Registering a resolver is how the "no resolver for actor type" warning
	// gets fixed, so let it warn again rather than stay silent on the strength
	// of a warning emitted before the fix.
	rearmWarnings('actor-type')
}

/**
 * Adds a grantee path to an actor type — additive and allowed on built-ins,
 * unlike resolver registration: WHO resolves an actor type is closed (a
 * security boundary), but what an actor can inherit through is open. This is
 * how a B2B plugin gives customers company inheritance without re-registering
 * the reserved `customer` type:
 *
 *     registerGranteePath('customer', { entity: 'company', path: 'company.id' })
 *
 * Duplicate `(actorType, entity, path)` registrations are idempotent no-ops,
 * so plugin load order and HMR re-evaluation are harmless. The actor type
 * need not be registered yet — paths for unknown types sit unused until a
 * registration arrives, since load order across plugins is not guaranteed.
 */
export function registerGranteePath(actorType: string, grantee: GranteePath): void {
	if (!grantee.entity || !grantee.path) {
		throw new MedusaError(
			MedusaError.Types.INVALID_DATA,
			`registerGranteePath: "${actorType}" supplied an incomplete grantee path — both "entity" and "path" are required.`
		)
	}
	let paths = global.AccessActorGrantees!.get(actorType)
	if (!paths) {
		paths = []
		global.AccessActorGrantees!.set(actorType, paths)
	}
	if (!paths.some(existing => existing.entity === grantee.entity && existing.path === grantee.path)) {
		paths.push({ entity: grantee.entity, path: grantee.path })
	}
}

/**
 * Every registered actor authenticator, for the guard to run against a
 * request whose path matches one of its declared prefixes.
 */
export function getActorAuthenticators(): { actorType: string; authenticate: RequestHandler; prefixes: string[] }[] {
	return [...global.AccessActorAuthenticators!.entries()].map(([actorType, { authenticate, prefixes }]) => ({ actorType, authenticate, prefixes }))
}

/**
 * Register a built-in only if nothing is registered for the actor type yet.
 *
 * The built-ins are registered at module-body evaluation time, and this
 * package can end up with two live copies of that module body sharing one
 * `globalThis` — `src/` and `.medusa/server/src/` both resolve to the same
 * global under ts-jest/HMR re-evaluation. An unconditional set from the
 * built-ins would silently clobber a consumer's registration the next time
 * either copy's module body re-runs. `registerActorResolver` itself must stay
 * an unconditional set for callers — this is only how the built-ins install
 * themselves.
 */
function registerBuiltinActor(input: { actorType: string; entity?: string; grantees?: GranteePath[] }): void {
	if (global.AccessActorEntities!.has(input.actorType)) {
		return
	}
	global.AccessActorEntities!.set(input.actorType, input.entity ?? input.actorType)
	for (const grantee of input.grantees ?? []) {
		registerGranteePath(input.actorType, grantee)
	}
}

/**
 * Walks a `query.graph` field path over a node, flattening to-many relations
 * at any level and keeping only string leaves.
 */
function collectPathIds(node: unknown, segments: string[]): string[] {
	if (node === null || node === undefined) {
		return []
	}
	if (Array.isArray(node)) {
		return node.flatMap(item => collectPathIds(item, segments))
	}
	if (!segments.length) {
		return typeof node === 'string' ? [node] : []
	}
	if (typeof node !== 'object') {
		return []
	}
	return collectPathIds((node as Record<string, unknown>)[segments[0]], segments.slice(1))
}

/**
 * Resolves an actor's role holdings, or `null` when the actor type is not
 * registered. `null` and `[]` mean different things: the first is a gap in
 * configuration, the second is an actor that genuinely holds nothing.
 *
 * Resolution is grantee walk → assignment lookup → dedupe:
 *
 * 1. Grantee identities: the identity pair `(entity, actorId)` plus, per
 *    registered grantee path, the ids reached by walking the path from the
 *    actor row (one `query.graph` for all paths). The walk is NEVER cached —
 *    its truth lives in foreign modules whose writes this plugin cannot
 *    observe.
 * 2. Assignments matching any grantee pair. Fetched with IN filters per
 *    column, then post-filtered to exact pairs — IN×IN alone would admit a
 *    row whose type and id each match a *different* grantee.
 * 3. Legacy `resolve` results union in as unscoped holdings. Note the
 *    collision this allows: a resolver returning a role id makes that role
 *    unscoped-held, which subsumes any scoped ASSIGNMENT of the same role —
 *    an operator's narrowing silently voided by plugin code. Prefer grantee
 *    paths.
 *
 * Dedupe: a role held unscoped anywhere collapses to one unscoped holding
 * (subsuming its scoped holdings); scoped holdings dedupe by (role, type, id).
 */
export async function resolveActorHoldings(actorType: string, actorId: string, container: MedusaContainer): Promise<ActorHolding[] | null> {
	const identityEntity = global.AccessActorEntities!.get(actorType)
	const legacyResolver = global.AccessActorResolvers!.get(actorType)

	if (!identityEntity && !legacyResolver) {
		return null
	}

	const holdings: ActorHolding[] = []

	if (identityEntity) {
		const pairs: { type: string; id: string }[] = [{ type: identityEntity, id: actorId }]

		const granteePaths = global.AccessActorGrantees!.get(actorType) ?? []
		if (granteePaths.length) {
			const query = resolveUnscopedQuery(container)
			const result = await query.graph({
				entity: identityEntity,
				fields: granteePaths.map(grantee => grantee.path),
				filters: { id: actorId }
			})
			const actorRow = result?.data?.[0]
			for (const grantee of granteePaths) {
				for (const id of collectPathIds(actorRow, grantee.path.split('.'))) {
					pairs.push({ type: grantee.entity, id })
				}
			}
		}

		const query = resolveUnscopedQuery(container)
		const result = await query.graph({
			entity: 'access_role_assignment',
			fields: ['role_id', 'grantee_type', 'grantee_id', 'scope_type', 'scope_id'],
			filters: {
				grantee_type: [...new Set(pairs.map(pair => pair.type))],
				grantee_id: [...new Set(pairs.map(pair => pair.id))]
			}
		})
		const rows = result?.data

		const pairKeys = new Set(pairs.map(pair => `${pair.type} ${pair.id}`))
		for (const row of rows ?? []) {
			if (!row?.role_id || !pairKeys.has(`${row.grantee_type} ${row.grantee_id}`)) {
				continue
			}
			holdings.push({
				role_id: row.role_id,
				scope: row.scope_type && row.scope_id ? { type: row.scope_type, id: row.scope_id } : null
			})
		}
	}

	if (legacyResolver) {
		for (const roleId of await legacyResolver(actorId, container)) {
			if (roleId) {
				holdings.push({ role_id: roleId, scope: null })
			}
		}
	}

	const unscoped = new Set<string>()
	for (const holding of holdings) {
		if (holding.scope === null) {
			unscoped.add(holding.role_id)
		}
	}

	const deduped: ActorHolding[] = [...unscoped].map(role_id => ({ role_id, scope: null }))
	const seenScoped = new Set<string>()
	for (const holding of holdings) {
		if (holding.scope === null || unscoped.has(holding.role_id)) {
			continue
		}
		const key = `${holding.role_id} ${holding.scope.type} ${holding.scope.id}`
		if (!seenScoped.has(key)) {
			seenScoped.add(key)
			deduped.push(holding)
		}
	}

	return deduped
}

/**
 * Role ids held UNSCOPED by an actor, or `null` when no resolver is registered
 * for the type. Scoped holdings are deliberately excluded here: every caller
 * of this function treats a role id as granting everywhere, and admitting a
 * tenancy-pinned holding unnarrowed would be strictly worse than ignoring it.
 * Scoped holdings activate through the holdings-aware authorization path only.
 */
export async function resolveActorRoles(actorType: string, actorId: string, container: MedusaContainer): Promise<string[] | null> {
	const holdings = await resolveActorHoldings(actorType, actorId, container)
	if (holdings === null) {
		return null
	}
	return holdings.filter(holding => holding.scope === null).map(holding => holding.role_id)
}

registerBuiltinActor({ actorType: 'user' })

// The same customer group that drives pricing drives access — groups are the
// convenience path for customer roles, expressed as a plain grantee walk.
registerBuiltinActor({ actorType: 'customer', grantees: [{ entity: 'customer_group', path: 'groups.id' }] })

// Actor type `api-key` (auth vocabulary) maps to Query entity `api_key`.
registerBuiltinActor({ actorType: 'api-key', entity: 'api_key' })
