/** Default cap on per-document upload size: 15 MB. */
export const DEFAULT_COMPLAINT_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024

export type ComplaintOptions = {
	/**
	 * Maximum size, in bytes, for a single uploaded complaint document.
	 *
	 * Defaults to 15 MB (`DEFAULT_COMPLAINT_DOCUMENT_MAX_BYTES`). Enforced by
	 * the multer middleware on `POST /admin/complaints/:id/documents`.
	 *
	 * NOTE: the admin drop-zone UI has its own client-side cap in
	 * `src/admin/components/document-drop-zone.tsx`. If you raise this server
	 * limit but leave the client constant at 15 MB, users will see "exceeds
	 * 15 MB limit" before the upload is even attempted. Keep the two in sync
	 * (or lower the client constant if you want a smaller cap).
	 */
	// maxDocumentBytes?: number

	/**
	 * Whether complaint relations are reachable only through the admin API.
	 *
	 * When true (the default), the module declares its complaint relations as
	 * restricted on `/store` via the access plugin's restricted-fields registry,
	 * so they cannot be reached through store field expansion (e.g.
	 * `?fields=complaints` on a customer or order) — silently, indistinguishable
	 * from the relation not existing. Requires `medusa-plugin-access` to be
	 * installed; without it the declaration is a no-op (see README for the
	 * core-only fallback).
	 *
	 * Set to false to expose complaint relations to store field expansion.
	 */
	adminOnly?: boolean
}
