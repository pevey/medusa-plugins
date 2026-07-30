// HMAC-SHA256 verification for incoming webhooks.
//
// Supports per-trigger SignatureConfig so the plugin can interoperate with
// platforms that use different header names, encodings, prefixes, and
// signed-input templates. Defaults reproduce the simple
// "x-webhook-signature: <hex>(raw body)" form.

import { createHmac, timingSafeEqual } from 'crypto'
import { IncomingHttpHeaders } from 'http'
import { SignatureConfig } from '../modules/automation/models/automation-trigger'

export type VerificationResult = { ok: true } | { ok: false; status: 400 | 401; error: string }

const DEFAULTS = {
	header: 'x-webhook-signature',
	encoding: 'hex' as const,
	template: '{body}'
}

function getHeader(headers: IncomingHttpHeaders, name: string): string | undefined {
	const raw = headers[name.toLowerCase()]
	if (Array.isArray(raw)) return raw[0]
	return raw
}

export function verifySignature(
	headers: IncomingHttpHeaders,
	rawBody: Buffer,
	signingKey: string,
	config: SignatureConfig | null | undefined,
	now: number = Math.floor(Date.now() / 1000)
): VerificationResult {
	const cfg = config ?? {}
	const headerName = cfg.header ?? DEFAULTS.header
	const encoding = cfg.encoding ?? DEFAULTS.encoding
	const template = cfg.template ?? DEFAULTS.template
	const prefix = cfg.prefix ?? ''

	const headerVal = getHeader(headers, headerName)
	if (!headerVal) {
		return { ok: false, status: 401, error: `Missing ${headerName} header` }
	}

	// Strip the configured prefix (e.g. "sha256=" for GitHub-style senders).
	let sigStr = headerVal
	if (prefix) {
		if (!sigStr.startsWith(prefix)) {
			return { ok: false, status: 401, error: 'Signature prefix mismatch' }
		}
		sigStr = sigStr.slice(prefix.length)
	}

	let providedBytes: Buffer
	try {
		providedBytes = Buffer.from(sigStr, encoding)
	} catch {
		return { ok: false, status: 401, error: 'Invalid signature encoding' }
	}
	// Guard against base64 silently truncating garbage input to empty.
	if (providedBytes.length === 0) {
		return { ok: false, status: 401, error: 'Invalid signature' }
	}

	// Timestamp handling: read header (if configured), validate replay window.
	let timestamp: string | undefined
	if (cfg.timestamp_header) {
		const tsHeader = getHeader(headers, cfg.timestamp_header)
		if (!tsHeader) {
			return { ok: false, status: 401, error: `Missing ${cfg.timestamp_header} header` }
		}
		const tsNum = Number(tsHeader)
		if (!Number.isFinite(tsNum) || !Number.isInteger(tsNum)) {
			return { ok: false, status: 401, error: 'Malformed timestamp header' }
		}
		const tolerance = cfg.tolerance_seconds ?? 0
		if (tolerance > 0 && Math.abs(now - tsNum) > tolerance) {
			return { ok: false, status: 401, error: 'Timestamp outside tolerance window' }
		}
		timestamp = tsHeader
	}

	// Template requires {ts} but no timestamp header is configured.
	if (template.includes('{ts}') && timestamp === undefined) {
		return {
			ok: false,
			status: 400,
			error: 'Template references {ts} but no timestamp_header is configured'
		}
	}

	// Render the signed-input template. Body is appended as raw bytes so
	// non-UTF8 payloads sign correctly; the prefix portion is utf-8.
	const bodyPos = template.indexOf('{body}')
	if (bodyPos === -1) {
		return { ok: false, status: 400, error: 'Template must include {body}' }
	}
	const before = template.slice(0, bodyPos).replace('{ts}', timestamp ?? '')
	const after = template.slice(bodyPos + '{body}'.length).replace('{ts}', timestamp ?? '')

	const hmac = createHmac('sha256', signingKey)
	if (before) hmac.update(before)
	hmac.update(new Uint8Array(rawBody))
	if (after) hmac.update(after)
	const expectedBytes = hmac.digest()

	if (providedBytes.length !== expectedBytes.length) {
		return { ok: false, status: 401, error: 'Invalid signature' }
	}
	const equal = timingSafeEqual(new Uint8Array(providedBytes), new Uint8Array(expectedBytes))
	if (!equal) {
		return { ok: false, status: 401, error: 'Invalid signature' }
	}

	return { ok: true }
}
