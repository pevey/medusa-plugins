/**
 * Configuration for the top-level `/access` namespace — the actor-agnostic
 * introspection surface (`/access/me/permissions`). Unlike `/admin/*`, whose
 * middleware hard-locks the actor type to `user`, `/access` serves whichever
 * actor types the application opts in: a POS operator, an affiliate portal, a
 * B2B customer portal. Defaults to `user` only, so installing access never
 * silently widens exposure.
 */

export type AccessNamespaceOptions = {
	/**
	 * Actor types allowed to authenticate on `/access` routes, additive to the
	 * `user` default. The routes are self-referential introspection
	 * (authenticated, not authorization-gated), and an actor type with no
	 * registered role resolution simply reports no permissions — but opting a
	 * type in is still an explicit choice.
	 */
	actorTypes?: string[]
	/**
	 * CORS origins for `/access` routes, in the same comma-separated form as
	 * `http.adminCors`. Defaults to the union of `http.adminCors` and
	 * `http.storeCors`, because the consumers straddle both worlds: the admin
	 * dashboard on one side, storefront portals on the other.
	 */
	cors?: string
}

declare global {
	// eslint-disable-next-line no-var
	var AccessNamespaceConfig: { actorTypes: Set<string>; cors?: string } | undefined
}

global.AccessNamespaceConfig ??= { actorTypes: new Set(['user']) }

/**
 * Opt actor types into the `/access` namespace and/or override its CORS
 * origins. Callable from any boot phase before the first request — the access
 * module's own loader routes plugin options here, and plugins registering a
 * custom actor type (via `registerActorResolver`) call it directly to let
 * their portal read `/access/me/permissions`.
 */
export function configureAccessNamespace(options: AccessNamespaceOptions): void {
	for (const actorType of options.actorTypes ?? []) {
		if (actorType) {
			global.AccessNamespaceConfig!.actorTypes.add(actorType)
		}
	}
	if (options.cors !== undefined) {
		global.AccessNamespaceConfig!.cors = options.cors
	}
}

export function accessNamespaceActorTypes(): string[] {
	return [...global.AccessNamespaceConfig!.actorTypes]
}

export function accessNamespaceCorsOverride(): string | undefined {
	return global.AccessNamespaceConfig!.cors
}
