export type OrderNoteModuleOptions = {
	/**
	 * Whether order notes are visible only through the admin API.
	 *
	 * When true (the default), the module declares its note relations as
	 * restricted on `/store` via the access plugin's restricted-fields registry,
	 * so they cannot be reached through store field expansion (e.g.
	 * `?fields=order_notes` on an order) — silently, indistinguishable from the
	 * relation not existing. Requires `medusa-plugin-access` to be installed;
	 * without it the declaration is a no-op (see README for the core-only
	 * fallback).
	 *
	 * Set to false to expose order notes to store clients.
	 */
	adminOnly?: boolean
}
