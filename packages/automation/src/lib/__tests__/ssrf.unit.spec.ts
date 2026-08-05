/// <reference types="jest" />
import { SsrfGuard } from '../ssrf'

describe('SsrfGuard.validateUrl', () => {
	it('rejects malformed URLs', () => {
		const g = new SsrfGuard()
		const r = g.validateUrl('not a url')
		expect(r.ok).toBe(false)
		if (!r.ok) expect(r.error).toMatch(/invalid/i)
	})

	it('rejects null/undefined/empty URLs', () => {
		const g = new SsrfGuard()
		expect(g.validateUrl(null).ok).toBe(false)
		expect(g.validateUrl(undefined).ok).toBe(false)
		expect(g.validateUrl('').ok).toBe(false)
	})

	it('rejects schemes outside the allowlist (default: https only)', () => {
		const g = new SsrfGuard()
		const cases = ['http://example.com', 'file:///etc/passwd', 'gopher://example.com', 'ftp://example.com']
		for (const url of cases) {
			const r = g.validateUrl(url)
			expect(r.ok).toBe(false)
			if (!r.ok) expect(r.error).toMatch(/scheme/i)
		}
	})

	it('allows http when explicitly enabled', () => {
		const g = new SsrfGuard({ allowedSchemes: ['http', 'https'] })
		expect(g.validateUrl('http://example.com').ok).toBe(true)
		expect(g.validateUrl('https://example.com').ok).toBe(true)
		expect(g.validateUrl('file:///etc/passwd').ok).toBe(false)
	})

	it('rejects hosts matched by blockedHosts (exact)', () => {
		const g = new SsrfGuard({ blockedHosts: ['evil.com'] })
		expect(g.validateUrl('https://evil.com/x').ok).toBe(false)
		expect(g.validateUrl('https://good.com/x').ok).toBe(true)
	})

	it('rejects hosts matched by blockedHosts (wildcard)', () => {
		const g = new SsrfGuard({ blockedHosts: ['*.internal.example.com'] })
		expect(g.validateUrl('https://api.internal.example.com').ok).toBe(false)
		expect(g.validateUrl('https://deep.api.internal.example.com').ok).toBe(false)
		// Bare apex is NOT matched by wildcard
		expect(g.validateUrl('https://internal.example.com').ok).toBe(true)
	})

	it('enforces allowedHosts as a constraint when set', () => {
		const g = new SsrfGuard({ allowedHosts: ['hooks.slack.com', '*.zapier.com'] })
		expect(g.validateUrl('https://hooks.slack.com/x').ok).toBe(true)
		expect(g.validateUrl('https://my.zapier.com/x').ok).toBe(true)
		expect(g.validateUrl('https://example.com/x').ok).toBe(false)
	})

	it('treats hostname matching case-insensitively', () => {
		const g = new SsrfGuard({ allowedHosts: ['Example.COM'] })
		expect(g.validateUrl('https://example.com').ok).toBe(true)
		expect(g.validateUrl('https://EXAMPLE.com').ok).toBe(true)
	})

	it('applies blocklist before allowlist (blocked wins)', () => {
		const g = new SsrfGuard({
			allowedHosts: ['*.example.com'],
			blockedHosts: ['evil.example.com']
		})
		expect(g.validateUrl('https://evil.example.com').ok).toBe(false)
		expect(g.validateUrl('https://good.example.com').ok).toBe(true)
	})
})

describe('SsrfGuard.isAddressBlocked', () => {
	const g = new SsrfGuard()

	it('blocks RFC1918 private IPv4 ranges', () => {
		expect(g.isAddressBlocked('10.0.0.1')).toMatch(/private/)
		expect(g.isAddressBlocked('172.16.0.1')).toMatch(/private/)
		expect(g.isAddressBlocked('192.168.1.1')).toMatch(/private/)
	})

	it('blocks loopback', () => {
		expect(g.isAddressBlocked('127.0.0.1')).toMatch(/loopback/)
		expect(g.isAddressBlocked('::1')).toMatch(/loopback/)
	})

	it('blocks link-local (incl. AWS/GCP/Azure cloud-metadata 169.254.169.254)', () => {
		expect(g.isAddressBlocked('169.254.169.254')).toMatch(/linkLocal/)
		expect(g.isAddressBlocked('fe80::1')).toMatch(/linkLocal/)
	})

	it('blocks IPv6 unique-local (fc00::/7)', () => {
		expect(g.isAddressBlocked('fc00::1')).toMatch(/uniqueLocal/)
		expect(g.isAddressBlocked('fd12:3456:789a::1')).toMatch(/uniqueLocal/)
	})

	it('blocks 0.0.0.0 and broadcast', () => {
		expect(g.isAddressBlocked('0.0.0.0')).toBeTruthy()
		expect(g.isAddressBlocked('255.255.255.255')).toBeTruthy()
	})

	it('blocks multicast', () => {
		expect(g.isAddressBlocked('224.0.0.1')).toMatch(/multicast/)
		expect(g.isAddressBlocked('ff02::1')).toMatch(/multicast/)
	})

	it('blocks carrier-grade NAT (100.64.0.0/10)', () => {
		expect(g.isAddressBlocked('100.64.0.1')).toBeTruthy()
	})

	it('blocks IPv4-mapped IPv6 (could embed a private IPv4)', () => {
		expect(g.isAddressBlocked('::ffff:10.0.0.1')).toBeTruthy()
		// Even IPv4-mapped public IPs are blocked — admins should use the IPv4
		// form directly. Wrapping public IPs in v6 syntax is unusual.
		expect(g.isAddressBlocked('::ffff:8.8.8.8')).toBeTruthy()
	})

	it('allows ordinary public IPs', () => {
		expect(g.isAddressBlocked('8.8.8.8')).toBeNull()
		expect(g.isAddressBlocked('1.1.1.1')).toBeNull()
		expect(g.isAddressBlocked('2001:4860:4860::8888')).toBeNull() // Google IPv6 DNS
	})

	it('returns null for unparseable input with a clear message', () => {
		expect(g.isAddressBlocked('not-an-ip')).toMatch(/unparseable/)
	})

	it('bypasses block when allowPrivateIps is true', () => {
		const permissive = new SsrfGuard({ allowPrivateIps: true })
		expect(permissive.isAddressBlocked('127.0.0.1')).toBeNull()
		expect(permissive.isAddressBlocked('169.254.169.254')).toBeNull()
	})
})

describe('SsrfGuard.fetch (DNS-bound dispatcher)', () => {
	it('rejects requests whose hostname resolves to a private IP', async () => {
		// localtest.me always resolves to 127.0.0.1 — exercises the dispatcher's
		// lookup callback end-to-end. undici wraps the lookup error as "fetch
		// failed" with the real SSRF message on the .cause property.
		const g = new SsrfGuard({ allowedSchemes: ['http', 'https'] })
		try {
			await g.fetch('http://localtest.me')
			throw new Error('expected fetch to reject')
		} catch (err: any) {
			const message = err?.cause?.message ?? err?.message ?? ''
			expect(message).toMatch(/SSRF guard|loopback|127\.0\.0\.1/i)
		}
	}, 10000)
})
