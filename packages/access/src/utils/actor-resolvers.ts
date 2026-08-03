import { MedusaContainer } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import type { RequestHandler } from 'express'
import { normalizePath } from './route-guards'
import { resolveUnscopedQuery } from './scoped-query'
import { rearmWarnings } from './warn-once'

export type ActorRoleResolver = (actorId: string, container: MedusaContainer) => Promise<string[]>

type ActorAuthenticator = { authenticate: RequestHandler; prefixes: string[] }

declare global {
	// eslint-disable-next-line no-var
	var AccessActorResolvers: Map<string, ActorRoleResolver> | undefined
	// eslint-disable-next-line no-var
	var AccessActorAuthenticators: Map<string, ActorAuthenticator> | undefined
}

global.AccessActorResolvers ??= new Map()
global.AccessActorAuthenticators ??= new Map()

/**
 * Teach the guard how to find an actor type's roles. Without this the guard can
 * only serve actors whose entity carries an `access_roles` link directly.
 *
 * Registering an `actorType` that is already registered throws: `user`,
 * `customer`, and `api-key` are reserved by this plugin's built-in resolvers,
 * and a silent replacement of any actor type's resolver — reserved or not —
 * is almost certainly a mistake rather than an intentional override. There is
 * no override flag and no second public function; this is the only behaviour
 * external callers get. The built-in registrations at the bottom of this
 * module go through a separate, private, set-if-absent path so HMR and the
 * `src` / `.medusa/server` two-realm case can re-run this module body without
 * crashing the app.
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
export function registerActorResolver(input: { actorType: string; resolve: ActorRoleResolver; authenticate?: RequestHandler; prefixes?: string[] }): void {
	const { actorType, resolve, authenticate, prefixes } = input

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
	if (global.AccessActorResolvers!.has(actorType)) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, `registerActorResolver: "${actorType}" is already registered — refusing to replace it.`)
	}

	global.AccessActorResolvers!.set(actorType, resolve)

	if (authenticate && prefixes) {
		global.AccessActorAuthenticators!.set(actorType, { authenticate, prefixes })
	}

	// Registering a resolver is how the "no resolver for actor type" warning
	// gets fixed, so let it warn again rather than stay silent on the strength
	// of a warning emitted before the fix.
	rearmWarnings('actor-type')
}

/**
 * Every registered actor authenticator, for the guard to run against a
 * request whose path matches one of its declared prefixes.
 */
export function getActorAuthenticators(): { actorType: string; authenticate: RequestHandler; prefixes: string[] }[] {
	return [...global.AccessActorAuthenticators!.entries()].map(([actorType, { authenticate, prefixes }]) => ({ actorType, authenticate, prefixes }))
}

/**
 * Register a built-in resolver only if nothing is registered for the actor
 * type yet.
 *
 * The built-ins (`user`, `customer`) are registered at module-body evaluation
 * time, and this package can end up with two live copies of that module body
 * sharing one `globalThis` — `src/` and `.medusa/server/src/` both resolve to
 * the same global under ts-jest/HMR re-evaluation. An unconditional `.set()`
 * from the built-ins would silently clobber a consumer's stricter override the
 * next time either copy's module body re-runs. `registerActorResolver` itself
 * must stay an unconditional set for callers — this is only how the built-ins
 * install themselves.
 */
function registerBuiltinActorResolver(input: { actorType: string; resolve: ActorRoleResolver }): void {
	if (!global.AccessActorResolvers!.has(input.actorType)) {
		global.AccessActorResolvers!.set(input.actorType, input.resolve)
	}
}

/**
 * Role ids held by an actor, or `null` when no resolver is registered for the
 * type. `null` and `[]` mean different things: the first is a gap in
 * configuration, the second is an actor that genuinely holds nothing.
 */
export async function resolveActorRoles(actorType: string, actorId: string, container: MedusaContainer): Promise<string[] | null> {
	const resolver = global.AccessActorResolvers!.get(actorType)
	if (!resolver) {
		return null
	}
	return await resolver(actorId, container)
}

const linkedAccessRoles =
	(entity: string): ActorRoleResolver =>
	async (actorId, container) => {
		const query = resolveUnscopedQuery(container)
		const { data } = await query.graph({
			entity,
			fields: ['access_roles.id'],
			filters: { id: actorId }
		})
		return data?.[0]?.access_roles?.map((role: { id: string }) => role.id).filter(Boolean) ?? []
	}

registerBuiltinActorResolver({ actorType: 'user', resolve: linkedAccessRoles('user') })

const customerAccessRoles: ActorRoleResolver = async (actorId, container) => {
	const query = resolveUnscopedQuery(container)
	const { data } = await query.graph({
		entity: 'customer',
		fields: ['access_roles.id', 'groups.access_roles.id'],
		filters: { id: actorId }
	})

	const roleIds = new Set<string>()
	for (const role of data?.[0]?.access_roles ?? []) {
		if (role?.id) {
			roleIds.add(role.id)
		}
	}
	for (const group of data?.[0]?.groups ?? []) {
		for (const role of group?.access_roles ?? []) {
			if (role?.id) {
				roleIds.add(role.id)
			}
		}
	}
	return [...roleIds]
}

registerBuiltinActorResolver({ actorType: 'customer', resolve: customerAccessRoles })

registerBuiltinActorResolver({ actorType: 'api-key', resolve: linkedAccessRoles('api_key') })

export { linkedAccessRoles }
