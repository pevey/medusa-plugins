# medusa-plugin-automation

Automation plugin for Medusa v2. Configure triggers from Medusa events or incoming webhooks, and execute actions like outgoing webhooks, HTTP requests, or Medusa workflows.

[Documentation](https://pevey.com/medusa-plugin-automation)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Two trigger types: Medusa events and incoming webhooks
- Three action types: outgoing webhooks, outgoing HTTP requests, and Medusa workflow execution
- HMAC-SHA256 signing for outgoing webhooks and incoming verification, with per-trigger config for header name, encoding, prefix, signed-input template, and timestamp-based replay protection
- Field mapping with dot-notation paths and fan-out iteration
- Optional query augmentation to enrich event data before action execution
- Delivery tracking with response codes and error logging
- Receipt logging for incoming webhook payloads with sensitive data redaction
- Signing secrets encrypted at rest, with secure one-time display on creation
- SSRF guard on outgoing requests: scheme allowlist, host allow/block lists, private-IP block via DNS-bound undici dispatcher
- Admin pages for trigger, action, and secret management

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-automation
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

After installing the plugin, you must run Medusa's migration tool to create the plugin's database tables.

```bash
yarn medusa db:migrate
```

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-automation',
			options: {
				automation: {
					secret: process.env.AUTOMATION_SECRET,
					maxWorkflowIterations: 50,
					ssrf: {
						allowedSchemes: ['https'],
						allowedHosts: [],
						blockedHosts: [],
						allowPrivateIps: false
					}
				}
			}
		}
		// ... other plugins
	]
})
```

### Plugin options

All options live under `options.automation` and are passed to the plugin's `AutomationOptions` type. Map them from environment variables of your choice in `medusa-config.ts`.

| Option                  | Type                    | Default      | Description                                                                                                                                                                                                                                                              |
| ----------------------- | ----------------------- | ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `secret`                | `string`                | **required** | Secret used to encrypt signing keys at rest (HMAC keys for outgoing webhooks and incoming-webhook trigger signatures). Must be at least 16 characters. Treat like `JWT_SECRET` — never commit, never rotate without expecting all stored signing keys to be invalidated. |
| `maxWorkflowIterations` | `number`                | `50`         | Maximum fan-out iterations when a field mapping uses `[]` syntax. `0` disables the cap (use with caution).                                                                                                                                                               |
| `ssrf.allowedSchemes`   | `('http' \| 'https')[]` | `['https']`  | URL schemes allowed for outgoing requests.                                                                                                                                                                                                                               |
| `ssrf.allowedHosts`     | `string[]`              | `[]`         | If non-empty, outgoing host MUST match one of these patterns. Supports exact hostnames and `*.example.com` wildcard (matches subdomains, not the apex).                                                                                                                  |
| `ssrf.blockedHosts`     | `string[]`              | `[]`         | Always reject these hosts. Same pattern syntax as `allowedHosts`.                                                                                                                                                                                                        |
| `ssrf.allowPrivateIps`  | `boolean`               | `false`      | Disable the private/reserved-IP block. Required for dev and integration tests targeting localhost. Never enable in production.                                                                                                                                           |

### Environment variables (set by the plugin itself)

The plugin reads exactly one environment variable directly, because the value is needed at HTTP-middleware load time before the plugin's options object exists:

| Env var                    | Default | Description                                                                                                                                                                                                      |
| -------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `MAX_WEBHOOK_PAYLOAD_SIZE` | `512kb` | Hard ceiling enforced by the Express body parser on `POST /webhooks/:id`. Requests above this size are rejected with `413` before reaching the handler. Accepts size strings like `'500kb'`, `'1mb'`, `'2.5mb'`. The default is sized for typical integration-target payloads (Shopify orders with many line items, CRM/helpdesk events, newsletter exports). |

Every other env var name is your choice — use whatever convention your deployment prefers and feed it into the options object in `medusa-config.ts`.

## Usage

- Configure automation triggers and actions in Settings > Automations in the Medusa admin.
- Create signing secrets for HMAC-SHA256 verification.
- Receive incoming webhooks at `POST /webhooks/:triggerId`.
- Monitor deliveries and receipts from the trigger and action detail pages.

### Per-trigger signing configuration

By default, an incoming-webhook trigger verifies signatures as `x-webhook-signature: <hex>` over the raw request body. To interoperate with senders that use different conventions (GitHub, Slack, Shopify, etc.), open a trigger's edit drawer and use **Advanced signing options**:

- **Signature Header** — header to read the signature from (e.g. `X-Hub-Signature-256` for GitHub)
- **Encoding** — `hex` or `base64`
- **Header Prefix** — stripped from the header value before decoding (e.g. `sha256=` for GitHub)
- **Signed Input Template** — supports `{body}` and `{ts}`. Default `{body}`. Slack-style: `v0:{ts}:{body}`.
- **Timestamp Header** — header to read for `{ts}` substitution and replay window
- **Replay Tolerance (seconds)** — reject requests whose timestamp is outside this window. Pair with the timestamp header for in-window replay dedup as well.

Senders that don't sign at all are supported — just leave the signing key blank. In that case the trigger URL itself is the only auth, and the admin UI displays a prominent warning to that effect.

## Rate limiting and bot protection

**This plugin does not implement inbound rate limiting** on the public `/webhooks/:triggerId` endpoint. That decision is intentional: in-Node, in-memory rate limiting in a multi-worker deployment is mostly theater (each worker has its own counter, so the effective limit is `N × workers`), and a CDN or WAF in front of the origin does the job orders of magnitude more effectively.

If your webhook endpoint is public-internet-facing, you should put some form of bot protection / rate limiting in front of the origin. Options:

- **Cloudflare** (free tier includes bot detection and basic DDoS shielding; paid plans add explicit rate-limit rules)
- **AWS WAF** rate-based rules in front of CloudFront or ALB
- **Fastly** or **Akamai** with their respective rate-limit policies
- **Nginx**'s `limit_req_zone` if you terminate TLS yourself
- A reverse proxy with `express-rate-limit`, `rate-limiter-flexible`, or similar in your own infrastructure

What the plugin _does_ provide on the inbound path: HMAC verification (cheap, constant-time), timestamp tolerance windows, optional in-window replay dedup, and a hard payload size cap. Those reduce per-request cost and limit the impact of accepted requests, but they don't replace edge-layer rate limiting.

## Security notes

- **Outgoing requests are routed through an SSRF guard** that resolves the hostname via DNS and rejects any address in private, loopback, link-local, multicast, reserved, IPv6 unique-local, or IPv4-mapped-IPv6 ranges. The check runs inside the undici dispatcher's `connect.lookup`, so there is no DNS-rebinding window between resolution and connection. Each redirect hop re-runs the check.
- **Headers an admin can attach to outgoing requests are filtered** to drop `Host`, `Content-Length`, `Transfer-Encoding`, `Te`, `Connection`, `Upgrade`, `Cookie`, `Set-Cookie`, and any `Proxy-*` header.
- **Stored signing keys are encrypted with AES-256-GCM** using a key derived from `options.secret`. The plaintext value is returned to the admin exactly once on creation and never again.
- **Delivery records** redact secret-looking keys (`password`, `token`, `bearer`, `authorization`, `api_key`, `session`, `jwt`, etc.) from stored request payloads and truncate stored response bodies to 4KB.
- **The `delete*Workflow` family of core-flows workflows is blocked from being invoked via automation actions** — both at save time (admin UI + API validator) and at dispatch time.
