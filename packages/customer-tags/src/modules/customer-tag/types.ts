export type CustomerTagModuleOptions = {
	/**
	 * Whether customer tags are visible only through the admin API.
	 *
	 * When true (the default), the module declares its tag relations as
	 * restricted on `/store` via the access plugin's restricted-fields registry,
	 * and store responses have them silently stripped — indistinguishable from
	 * the relation not existing. Requires `medusa-plugin-access` to be
	 * installed; without it the declaration is a no-op (see README for the
	 * core-only fallback).
	 *
	 * Set to false to expose customer tags to store clients.
	 */
	adminOnly?: boolean
}
