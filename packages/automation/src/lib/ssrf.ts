// SSRF guard for outgoing HTTP from the automation plugin.
//
// Two layers of defense:
//   1. Synchronous URL validation — scheme allowlist + host pattern allow/block lists.
//      Cheap, runs on every outgoing call and at trigger-action save time so admins
//      see misconfiguration immediately.
//   2. DNS-bound dispatcher — a custom undici Agent whose connect.lookup resolves
//      the hostname, validates every returned address against the private/reserved
//      range block, and connects to the validated IP. Because the resolution and
//      the connection happen inside the same dispatcher call, there is no DNS-
//      rebinding window between "check IP" and "open socket" — the IP we
//      validated is the IP we connect to.
//
// On every redirect hop, undici calls the dispatcher's connect again, so the
// IP check re-runs for each Location. That covers the redirect-bypass class
// of SSRF without forcing redirect: 'manual'.

import * as dns from 'dns'
import ipaddr from 'ipaddr.js'
import { Agent, fetch as undiciFetch } from 'undici'
import type { SsrfOptions } from '../modules/automation/types'

const DEFAULT_ALLOWED_SCHEMES: ('http' | 'https')[] = ['https']

// Whitelist of IP ranges treated as "safe" — anything else is blocked.
// Fail-closed: a new ipaddr.js range type is blocked until we audit it.
const SAFE_V4_RANGES = new Set(['unicast'])
const SAFE_V6_RANGES = new Set(['unicast'])

export type UrlValidationResult = { ok: true; url: URL } | { ok: false; error: string }

export class SsrfGuard {
	private readonly allowedSchemes: Set<string>
	private readonly allowedHosts: string[]
	private readonly blockedHosts: string[]
	private readonly allowPrivateIps: boolean
	private readonly agent: Agent

	constructor(opts: SsrfOptions = {}) {
		this.allowedSchemes = new Set(opts.allowedSchemes ?? DEFAULT_ALLOWED_SCHEMES)
		this.allowedHosts = (opts.allowedHosts ?? []).map(h => h.toLowerCase())
		this.blockedHosts = (opts.blockedHosts ?? []).map(h => h.toLowerCase())
		this.allowPrivateIps = opts.allowPrivateIps ?? false
		this.agent = new Agent({
			connect: {
				lookup: this.lookup.bind(this)
			}
		})
	}

	/**
	 * Synchronously validate scheme + host patterns. Does NOT do DNS. Suitable
	 * for save-time validation in admin routes and as the first gate at delivery.
	 */
	validateUrl(rawUrl: string | null | undefined): UrlValidationResult {
		if (!rawUrl) return { ok: false, error: 'URL is required' }

		let url: URL
		try {
			url = new URL(rawUrl)
		} catch {
			return { ok: false, error: 'Invalid URL' }
		}

		const scheme = url.protocol.replace(/:$/, '').toLowerCase()
		if (!this.allowedSchemes.has(scheme)) {
			return {
				ok: false,
				error: `URL scheme '${scheme}' not allowed (allowed: ${[...this.allowedSchemes].join(', ')})`
			}
		}

		const hostname = url.hostname.toLowerCase()
		if (!hostname) return { ok: false, error: 'URL is missing a hostname' }

		if (this.blockedHosts.length > 0 && this.matchesAny(hostname, this.blockedHosts)) {
			return { ok: false, error: `Host '${hostname}' is blocked by plugin config` }
		}

		// Allowlist is a CONSTRAINT (must match if set), not a BYPASS — IP check
		// still applies even for allowlisted hosts.
		if (this.allowedHosts.length > 0 && !this.matchesAny(hostname, this.allowedHosts)) {
			return { ok: false, error: `Host '${hostname}' is not in allowedHosts` }
		}

		return { ok: true, url }
	}

	/**
	 * fetch() bound to this guard's dispatcher. Caller is still responsible for
	 * calling validateUrl() first — this only enforces the IP-level check.
	 */
	fetch(url: string, init?: Parameters<typeof undiciFetch>[1]) {
		return undiciFetch(url, { ...init, dispatcher: this.agent })
	}

	/**
	 * Validate a single literal IP address. Used directly by tests; in normal
	 * operation this runs inside the dispatcher's lookup callback.
	 */
	isAddressBlocked(address: string): string | null {
		if (this.allowPrivateIps) return null
		let parsed: ReturnType<typeof ipaddr.parse>
		try {
			parsed = ipaddr.parse(address)
		} catch {
			return `unparseable address '${address}'`
		}
		const range = parsed.range()
		const safe = parsed.kind() === 'ipv4' ? SAFE_V4_RANGES : SAFE_V6_RANGES
		if (!safe.has(range)) {
			return `address ${address} is in '${range}' range`
		}
		return null
	}

	private matchesAny(hostname: string, patterns: string[]): boolean {
		return patterns.some(p => this.matchesPattern(hostname, p))
	}

	private matchesPattern(hostname: string, pattern: string): boolean {
		if (pattern === hostname) return true
		if (pattern.startsWith('*.')) {
			// *.example.com matches foo.example.com but NOT example.com itself
			return hostname.endsWith('.' + pattern.slice(2))
		}
		return false
	}

	private lookup(hostname: string, opts: dns.LookupOptions, callback: (err: NodeJS.ErrnoException | null, address: string, family: number) => void): void {
		dns.lookup(hostname, { all: true, family: opts.family ?? 0 }, (err, addrs) => {
			if (err) {
				callback(err, '', 0)
				return
			}
			if (!Array.isArray(addrs) || addrs.length === 0) {
				callback(new Error(`SSRF guard: no addresses for ${hostname}`), '', 0)
				return
			}
			// All resolved addresses must pass. If any is private/reserved, reject
			// — DNS round-robin shouldn't be able to slip a private IP past us.
			for (const a of addrs) {
				const blocked = this.isAddressBlocked(a.address)
				if (blocked) {
					callback(new Error(`SSRF guard: ${blocked} (resolved from ${hostname})`), '', 0)
					return
				}
			}
			const first = addrs[0]
			callback(null, first.address, first.family)
		})
	}
}
