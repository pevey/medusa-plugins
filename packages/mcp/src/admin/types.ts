// Response types for the mcp admin chat-session HTTP surface (used by
// `src/admin/hooks/sessions.ts` and cross-checked against real responses by
// `integration-tests/http/response-contracts.ts`).
//
// Deliberately its own file with NO runtime imports (unlike
// `hooks/sessions.ts`, which imports the SDK client via `../lib/sdk`, which
// in turn uses `import.meta.env` -- a construct the plugin's own
// `tsconfig.json`, which targets Node16/CommonJS for the server build,
// cannot parse). `integration-tests/http/response-contracts.ts` needs to
// type-only-import these shapes, and doing so through `hooks/sessions.ts`
// pulls that file's import graph (including `sdk.ts`) into the same
// TypeScript program and fails `tsc --noEmit -p tsconfig.json` with
// `TS1470: The 'import.meta' meta-property is not allowed in files which
// will build into CommonJS output`. This file mirrors `lib/chat-messages.ts`'s
// existing "no React / no `import.meta`" isolation, for the same reason.
import type { WireMessage } from './lib/chat-messages'

export type SessionSummary = { id: string; title: string; last_message_at: string }

// GET /admin/chat/sessions
export type SessionsListResponse = { sessions: SessionSummary[] }

// GET /admin/chat/sessions/:id
export type SessionDetailResponse = { session: { id: string; title: string }; messages: WireMessage[] }

// DELETE /admin/chat/sessions/:id
export type DeleteSessionResponse = { id: string; deleted: true }
