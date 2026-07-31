/**
 * Response contracts for the mcp admin chat-session HTTP surface.
 *
 * Each exported `*Schema` is a `z.strictObject` that mirrors one of the
 * hand-written (or, in three cases below, newly-named) admin types the chat
 * page and session sidebar are developed and typechecked against. Nothing
 * previously verified those types actually matched what the routes return --
 * the admin dashboard is bundled by Vite and never typechecked against a real
 * HTTP response, and the test harness fakes the SDK, so it only ever sees
 * fixtures a test author wrote. This module plus the `.parse()` calls in
 * `mcp.spec.ts` close that gap.
 *
 * Three links, three enforcement mechanisms:
 *
 *   1. type <-> schema      tsc, via the two-way assignability consts below.
 *                           Edit the type or the schema without the other and
 *                           `yarn workspace medusa-plugin-mcp typecheck` fails.
 *   2. schema <-> response  `Schema.parse(...)` in mcp.spec.ts. A route that
 *                           stops returning a field, or starts returning an
 *                           extra one, fails the parse -- `z.strictObject`
 *                           rejects unknown keys, so both directions are
 *                           caught, not just missing ones.
 *   3. type <-> components  tsc, via the admin dashboard's own typecheck (not
 *                           part of this file; mcp has no `tsconfig.admin.json`
 *                           yet -- see task-4c-mcp-report.md).
 *
 * SSE is explicitly out of scope for `.parse()` here. `POST /admin/chat`
 * replies `text/event-stream`, not JSON, on the success path -- there is no
 * single JSON body to parse. Its wire event payloads (`session`, `text`,
 * `tool_call`, `tool_result`, `done`, `error`) are shaped by the `send(event,
 * data)` calls in `src/api/admin/chat/route.ts` and consumed field-by-field
 * (with `any`-typed frame data) in `src/admin/hooks/chat.ts`'s
 * `processFrames`, which is exactly the SSE-vs-JSON distinction this task
 * flagged up front. Actually exercising that route over HTTP requires a
 * configured LLM provider (`createProvider` in `src/lib/llm-provider.ts`
 * `require`s the Anthropic/OpenAI SDK directly -- there is no fake/mock
 * provider seam), and this suite has no API key configured, so it never has
 * and still does not call `POST /admin/chat` at the HTTP layer. Writing
 * schemas for the individual SSE event payloads without ever `.parse()`ing a
 * real one would just be dead weight (the pilot's rule 5: every exported
 * schema here is wired to a real `.parse()` assertion), so none are declared.
 * What IS covered below is the wire message/content-block model that
 * `foldToolResults` hydrates from and that `GET /admin/chat/sessions/:id`
 * actually returns as JSON once a turn is persisted (`WireMessage` /
 * `WireContentBlock`, mirroring `src/admin/lib/chat-messages.ts` exactly) --
 * that is real JSON, and is the wire shape this task asked to model.
 *
 * mcp's session-response types now live in `src/admin/types.ts` (session
 * summary + response envelopes for the three JSON routes below); the
 * message/content-block model lives in `src/admin/lib/chat-messages.ts`,
 * imported separately. `src/admin/types.ts` did not exist before this task --
 * it was split out of `src/admin/hooks/sessions.ts`, where these three
 * response shapes previously lived either as inline anonymous `useQuery<...>`
 * generics or, for the delete response, not typed at all. See that file's
 * header comment for why: importing them (even via `import type`) through
 * `hooks/sessions.ts` pulls its `sdk.ts` import into the same tsc program and
 * fails on `import.meta`, which `sdk.ts` uses and this plugin's
 * Node16/CommonJS `tsconfig.json` rejects.
 */
import { z } from '@medusajs/framework/zod'
import type { DeleteSessionResponse, SessionDetailResponse, SessionsListResponse, SessionSummary } from '../../src/admin/types'
import type { TextBlock, WireContentBlock, WireMessage, WireToolResultBlock, WireToolUseBlock } from '../../src/admin/lib/chat-messages'

// ── Wire content blocks (GET /admin/chat/sessions/:id `messages`) ───────────

export const TextBlockSchema = z.strictObject({
	type: z.literal('text'),
	text: z.string()
})
const _textBlockSchemaMatchesType: TextBlock = {} as z.infer<typeof TextBlockSchema>
const _textBlockTypeMatchesSchema: z.infer<typeof TextBlockSchema> = {} as TextBlock

export const WireToolUseBlockSchema = z.strictObject({
	type: z.literal('tool_use'),
	id: z.string(),
	name: z.string(),
	input: z.record(z.string(), z.unknown())
})
const _wireToolUseBlockSchemaMatchesType: WireToolUseBlock = {} as z.infer<typeof WireToolUseBlockSchema>
const _wireToolUseBlockTypeMatchesSchema: z.infer<typeof WireToolUseBlockSchema> = {} as WireToolUseBlock

export const WireToolResultBlockSchema = z.strictObject({
	type: z.literal('tool_result'),
	tool_use_id: z.string(),
	content: z.string(),
	is_error: z.boolean().optional()
})
const _wireToolResultBlockSchemaMatchesType: WireToolResultBlock = {} as z.infer<typeof WireToolResultBlockSchema>
const _wireToolResultBlockTypeMatchesSchema: z.infer<typeof WireToolResultBlockSchema> = {} as WireToolResultBlock

export const WireContentBlockSchema = z.discriminatedUnion('type', [TextBlockSchema, WireToolUseBlockSchema, WireToolResultBlockSchema])
const _wireContentBlockSchemaMatchesType: WireContentBlock = {} as z.infer<typeof WireContentBlockSchema>
const _wireContentBlockTypeMatchesSchema: z.infer<typeof WireContentBlockSchema> = {} as WireContentBlock

export const WireMessageSchema = z.strictObject({
	role: z.enum(['user', 'assistant']),
	content: z.array(WireContentBlockSchema)
})
const _wireMessageSchemaMatchesType: WireMessage = {} as z.infer<typeof WireMessageSchema>
const _wireMessageTypeMatchesSchema: z.infer<typeof WireMessageSchema> = {} as WireMessage

// ── Chat sessions ─────────────────────────────────────────────────────────

export const SessionSummarySchema = z.strictObject({
	id: z.string(),
	title: z.string(),
	last_message_at: z.string()
})
const _sessionSummarySchemaMatchesType: SessionSummary = {} as z.infer<typeof SessionSummarySchema>
const _sessionSummaryTypeMatchesSchema: z.infer<typeof SessionSummarySchema> = {} as SessionSummary

// GET /admin/chat/sessions
export const ChatSessionsListResponseSchema = z.strictObject({
	sessions: z.array(SessionSummarySchema)
})
const _sessionsListSchemaMatchesType: SessionsListResponse = {} as z.infer<typeof ChatSessionsListResponseSchema>
const _sessionsListTypeMatchesSchema: z.infer<typeof ChatSessionsListResponseSchema> = {} as SessionsListResponse

// GET /admin/chat/sessions/:id
export const ChatSessionDetailResponseSchema = z.strictObject({
	session: z.strictObject({ id: z.string(), title: z.string() }),
	messages: z.array(WireMessageSchema)
})
const _sessionDetailSchemaMatchesType: SessionDetailResponse = {} as z.infer<typeof ChatSessionDetailResponseSchema>
const _sessionDetailTypeMatchesSchema: z.infer<typeof ChatSessionDetailResponseSchema> = {} as SessionDetailResponse

// DELETE /admin/chat/sessions/:id
export const ChatSessionDeleteResponseSchema = z.strictObject({
	id: z.string(),
	deleted: z.literal(true)
})
const _sessionDeleteSchemaMatchesType: DeleteSessionResponse = {} as z.infer<typeof ChatSessionDeleteResponseSchema>
const _sessionDeleteTypeMatchesSchema: z.infer<typeof ChatSessionDeleteResponseSchema> = {} as DeleteSessionResponse

// ── Error envelope ────────────────────────────────────────────────────────
//
// The plugin's own routes (`sessions/[id]/route.ts`'s 404s) reply with this
// shape. The bare "no bearer token at all" 401 in `mcp.spec.ts` is Medusa
// core's own auth-middleware response (the plugin's route code never runs),
// not this plugin's contract, so it is intentionally not modelled or parsed
// here -- same rule the pilot used for not modelling core-Medusa entities.
export const ChatErrorResponseSchema = z.strictObject({
	error: z.string()
})

// ── MCP protocol surface (POST /admin/mcp) ────────────────────────────────
//
// These model the JSON-RPC envelopes the MCP SDK writes for `POST /admin/mcp`,
// now on SDK v2. Unlike everything above, they are deliberately NOT two-way
// assignability-checked against a hand-written type: the SDK's own result types
// are declared with an index signature, so `z.infer<typeof someStrictObject>`
// is never assignable *from* them and the `const _x: SdkType = {} as
// z.infer<...>` trick fails in one direction by construction. The SDK is the
// upstream authority for these shapes, not this plugin, so there is no local
// type to keep in sync -- the `.parse()` calls in mcp.spec.ts are the whole
// enforcement mechanism here.
//
// The v1->v2 migration is the reason these are split by era. `createMcpHandler`
// serves BOTH revisions from one endpoint, and they do not return the same
// thing: a 2026-07-28 result carries `resultType` (and, on cacheable list
// results, `ttlMs` + `cacheScope`) plus a `_meta` server identity, while a
// 2025-11-25 result carries none of that. Modelling them with one permissive
// schema would let a modern-only field silently go missing from modern
// responses, which is exactly the regression worth catching. So: two schemas,
// both `z.strictObject`, each asserting its era's shape exactly.
//
// The previous version of this block was written against v1 as a deliberate
// migration tripwire, and it worked -- the strict parses failed by name on
// `resultType`, `ttlMs` and `cacheScope` appearing, and on the v1-only
// `execution` field (task-augmented execution) disappearing when 2026-07-28
// moved tasks out of core into the `io.modelcontextprotocol/tasks` extension.
// That is why `execution` is gone below.
//
// Nested payloads stay looser. `inputSchema` is a JSON Schema document the SDK
// now generates natively from each tool's Zod object schema (note the emitted
// `$schema` key); its interior is zod's business, not this plugin's contract,
// so it is modelled only as far as this plugin guarantees it.

// JSON-RPC 2.0 error envelope.
//
// v2 uses this MORE than v1 did. In v1 the CallToolRequest handler caught every
// throw -- including its own "Tool X not found" -- and folded it into a
// CallToolResult with `isError: true`. On the modern path an unknown tool is
// now a real JSON-RPC error (-32602), so a client distinguishes "the tool
// failed" from "there is no such tool" at the protocol level instead of by
// reading prose out of a text block.
export const JsonRpcErrorResponseSchema = z.strictObject({
	jsonrpc: z.literal('2.0'),
	id: z.union([z.string(), z.number(), z.null()]),
	error: z.strictObject({
		code: z.number(),
		message: z.string(),
		data: z.unknown().optional()
	})
})

// The `_meta` envelope every modern result carries. 2026-07-28 removed the
// initialize handshake, so server identity rides on each result instead of
// being negotiated once per connection.
export const ModernResultMetaSchema = z.looseObject({
	'io.modelcontextprotocol/serverInfo': z.looseObject({
		name: z.string(),
		version: z.string()
	})
})

// One entry of `tools/list`, identical across eras.
export const McpToolDescriptorSchema = z.strictObject({
	name: z.string(),
	description: z.string(),
	inputSchema: z.looseObject({
		type: z.literal('object'),
		properties: z.record(z.string(), z.unknown()).optional()
	})
})

// ── Legacy (2025-11-25) results ───────────────────────────────────────────

export const LegacyToolsListResultSchema = z.strictObject({
	tools: z.array(McpToolDescriptorSchema),
	nextCursor: z.string().optional()
})

export const LegacyCallToolResultSchema = z.strictObject({
	content: z.array(TextBlockSchema),
	isError: z.boolean().optional(),
	structuredContent: z.record(z.string(), z.unknown()).optional()
})

// `initialize` -> InitializeResult. Legacy-only: 2026-07-28 removed the
// handshake, so a modern client never sends this.
export const LegacyInitializeResultSchema = z.strictObject({
	protocolVersion: z.string(),
	capabilities: z.record(z.string(), z.unknown()),
	serverInfo: z.looseObject({
		name: z.string(),
		version: z.string()
	}),
	instructions: z.string().optional()
})

// ── Modern (2026-07-28) results ───────────────────────────────────────────
//
// `ttlMs` + `cacheScope` are required on cacheable list results. Both come
// from the SDK's defaults rather than anything this plugin configures, and
// both defaults happen to be the ones this plugin needs: `cacheScope:
// 'private'` is REQUIRED FOR CORRECTNESS here because this server's tool list
// varies per caller (write tools are filtered out by `allowWriteTools` and the
// `mcp:write` policy), so a shared intermediary must never reuse one admin's
// list for another. It is asserted below precisely so a future SDK default
// flip to 'public' fails loudly instead of silently widening cache scope.
export const ModernToolsListResultSchema = z.strictObject({
	tools: z.array(McpToolDescriptorSchema),
	resultType: z.literal('complete'),
	ttlMs: z.number(),
	cacheScope: z.enum(['public', 'private']),
	_meta: ModernResultMetaSchema.optional(),
	nextCursor: z.string().optional()
})

// `tools/call` carries `resultType` but NOT the cache fields -- only list-class
// results are cacheable.
export const ModernCallToolResultSchema = z.strictObject({
	content: z.array(TextBlockSchema),
	resultType: z.literal('complete'),
	isError: z.boolean().optional(),
	structuredContent: z.record(z.string(), z.unknown()).optional(),
	_meta: ModernResultMetaSchema.optional()
})

// `server/discover` -> DiscoverResult. New in 2026-07-28 and MUST be
// implemented by every server; it replaces `initialize` as the way a client
// learns supported versions, capabilities and identity up front.
export const ModernDiscoverResultSchema = z.strictObject({
	supportedVersions: z.array(z.string()),
	capabilities: z.record(z.string(), z.unknown()),
	resultType: z.literal('complete'),
	ttlMs: z.number(),
	cacheScope: z.enum(['public', 'private']),
	_meta: ModernResultMetaSchema.optional()
})
