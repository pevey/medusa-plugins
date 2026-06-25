export type SsrfOptions = {
	/** URL schemes allowed for outgoing requests. Default: ['https']. */
	allowedSchemes?: ('http' | 'https')[]
	/**
	 * If set and non-empty, outgoing host MUST match one of these patterns.
	 * Supports exact hostnames and `*.example.com` wildcard (matches subdomains, not the apex).
	 */
	allowedHosts?: string[]
	/** Always reject these hosts. Same pattern syntax as allowedHosts. */
	blockedHosts?: string[]
	/**
	 * Disable the private/reserved-IP block. Required for dev and integration tests
	 * that target localhost. Never enable in production.
	 */
	allowPrivateIps?: boolean
}

export type AutomationOptions = {
	/**
	 * Secret used to encrypt signing keys at rest (HMAC keys for outgoing
	 * webhooks and incoming-webhook trigger signatures).
	 *
	 * REQUIRED. Must be at least 16 characters. Typically loaded from
	 * `process.env.AUTOMATION_SECRET`. Treat this like JWT_SECRET — store
	 * it in a secrets manager, never commit it, and rotate carefully:
	 * rotating it invalidates every signing key stored in the database.
	 */
	secret: string

	/**
	 * Maximum number of workflow iterations when a field mapping uses [] fan-out syntax.
	 * Defaults to 50. Set to 0 for no cap (use with caution).
	 */
	maxWorkflowIterations?: number

	/**
	 * SSRF guard configuration for outgoing webhook and HTTP request actions.
	 * Defaults to: https-only, no allow/block list, private/reserved IPs blocked.
	 */
	ssrf?: SsrfOptions
}
