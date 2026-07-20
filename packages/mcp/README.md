# medusa-plugin-mcp

MCP server and LLM chat plugin for Medusa v2. Exposes your store's data and operations to LLMs as tools over the Model Context Protocol, and adds an admin chat page that talks to Anthropic or OpenAI — including any OpenAI-compatible local model.

[Documentation](https://pevey.com/medusa-plugin-mcp)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- **MCP server** over streamable-HTTP at `POST /admin/mcp`, built on the official `@modelcontextprotocol/sdk`. Point any MCP client (for example Claude Desktop) at it to give an assistant read access to your store.
- **Built-in tools** for querying Medusa — a generic graph `query` plus focused tools for orders, customers, products, and inventory.
- **Admin Chat page** — converse with an LLM that calls those tools to answer questions about your store, right inside the Medusa admin.
- **Pluggable LLM provider** — Anthropic or OpenAI (including self-hosted, OpenAI-compatible servers), chosen in config.
- **Extensible** — other plugins contribute tools via a small `registerMcpTools` API (listed in `toolPackages`); `medusa-plugin-automation` ships automation tools this way.
- **Write tools off by default** — actions that mutate/dispatch are disabled unless you opt in, and can be gated with `medusa-plugin-access` (see [Security](#security)).

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-mcp
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

This plugin adds no database tables, so there is no migration to run.

## Configuration

Enable in your `medusa-config.ts` file. You **must** choose an LLM provider and model, and supply an API key for Anthropic or OpenAI:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-mcp',
			options: {
				provider: 'anthropic', // 'anthropic' | 'openai'
				model: 'claude-sonnet-4-5', // a model id for the chosen provider
				apiKey: process.env.MCP_LLM_API_KEY, // required (use any non-empty value for a local server)
				baseUrl: process.env.MCP_LLM_BASE_URL, // optional; point at a local OpenAI-compatible server to use a self-hosted model
				systemPrompt: 'Extra instructions for the assistant.', // optional
				allowWriteTools: false, // default; enable + gate with medusa-plugin-access to allow write tools
				toolPackages: ['medusa-plugin-automation/mcp'], // tools contributed by other plugins
				chatRetentionDays: 30, // optional; delete idle sessions after this many days (0 = keep forever)
				maxHistoryTurns: 10 // optional; send last N user turns to the LLM (0 = unlimited)
			}
		}
		// ... other plugins
	]
})
```

The plugin does not read any environment variables itself — map your own env vars into `options` as shown above.

### Options

| Option | Type | Required | Description |
| --- | --- | --- | --- |
| `provider` | `'anthropic' \| 'openai'` | **yes** | Which LLM backend to use. |
| `model` | `string` | **yes** | A model id for the chosen provider. |
| `apiKey` | `string` | **yes** | API key for the provider. For a local OpenAI-compatible server any non-empty value works. |
| `baseUrl` | `string` | no | Custom API base URL. Point at a local OpenAI-compatible server (e.g. Ollama, LM Studio, vLLM, llama.cpp) to use a self-hosted model. |
| `systemPrompt` | `string` | no | Appended to the plugin's built-in system prompt. |
| `allowWriteTools` | `boolean` | no | Allow tools that perform write/dispatch actions. **Defaults to `false`.** See [Security](#security). |
| `toolPackages` | `string[]` | no | Import specifiers of packages that contribute tools via `registerMcpTools` (e.g. `'medusa-plugin-automation/mcp'`). |
| `chatRetentionDays` | `number` | no | Sessions idle for more than this many days are auto-deleted by a daily job. **Defaults to `30`.** Set to `0` or negative to disable purging (keep sessions forever). |
| `maxHistoryTurns` | `number` | no | Max recent user turns sent to the LLM per request (bounds context size and cost). Limits what is sent to the model, not what is stored or displayed. **Defaults to `10`.** Set to `0` or negative for unlimited. |

Without `provider`, `model`, and `apiKey`, the chat endpoint returns an error.

## The admin chat

Open **Chat** from the Medusa admin sidebar (`/app/chat`). Ask about your store — the assistant runs an LLM tool-use loop, calling the built-in tools as needed. Replies **stream token-by-token**; tool calls appear as **live cards** inline beneath the reply, and responses are rendered as **Markdown**.

Chats are **persistent per-admin session** — each admin user has their own sessions, viewable and switchable from a sidebar. Resume past conversations, or delete them individually. Sessions idle for longer than `chatRetentionDays` (default 30 days) are auto-deleted by a daily job.

Notes:

- Replies **stream token-by-token**; tool calls appear as **live cards** (tool name + a spinner while running, then the result) inline beneath the reply, and assistant text is rendered as **Markdown** (GFM — tables, lists, code) so store data formats cleanly.
- A **Stop** button cancels an in-flight response.
- The **full** conversation is stored and shown when you resume a session; to bound context size and cost, only the most recent `maxHistoryTurns` user turns are sent to the model each request (older turns stay visible but aren't re-sent).

### Using a local LLM

Any OpenAI-compatible server works through the `openai` provider — set `baseUrl` to its `/v1` endpoint and use any non-empty `apiKey` (most local servers ignore it).

```ts
options: {
  provider: 'openai',
  model: 'qwen2.5', // a tool-capable model available on your server
  apiKey: 'local',  // any non-empty value; local servers usually ignore it
  baseUrl: 'http://localhost:11434/v1', // Ollama's OpenAI-compatible endpoint
}
```

Compatible servers with their base URLs:

- **Ollama** — `http://localhost:11434/v1`
- **LM Studio** — `http://localhost:1234/v1`
- **vLLM** — OpenAI-compatible mode
- **llama.cpp** — OpenAI-compatible mode

**Important:** tool-calling in the chat depends on the model. Pick a model that supports function/tool calling — many small local models don't, or do it unreliably. Without it, the assistant can chat but won't call store tools.

## The MCP server

The MCP server is exposed over **streamable-HTTP** at `POST /admin/mcp`. To connect an external MCP client:

- Point it at `<your-backend>/admin/mcp`.
- Authenticate as a Medusa admin — the endpoint is admin-only, so send a valid admin session cookie or admin API token. There is no separate MCP token.
- The server runs **stateless** — each request is handled independently, so it scales across multiple instances with no session affinity or memory to leak. The client sends `initialize` then its `tools/list` / `tools/call` requests as usual.

The server advertises the MCP **tools** capability (`tools/list`, `tools/call`); it does not serve resources or prompts.

## Available tools

Always available:

- `query` — run a Medusa graph query over an allow-list of core entities.
- `recent_orders`, `get_order`
- `search_customers`, `get_customer`
- `search_products`, `get_product`
- `low_stock_items`, `get_inventory_item`

Contributed by `medusa-plugin-automation` when it is installed and listed in `toolPackages`:

- `list_automations`, `get_automation`, `list_automation_deliveries` (read)
- `trigger_automation`, `retry_deliveries` (**write** — only available when `allowWriteTools` is enabled; see [Security](#security))

## Extending with your own tools

Any plugin can contribute MCP tools. Export a `registerMcpTools(registry, scope)` function and add its import specifier to `toolPackages`:

```ts
// in your plugin, exported from e.g. medusa-plugin-foo/mcp
import type { MedusaContainer } from '@medusajs/framework/types'
import { z } from 'zod'

export function registerMcpTools(registry: any, scope: MedusaContainer) {
	registry.registerTool(
		'get_widget',
		{
			description: 'Fetch a widget by id.',
			inputSchema: { id: z.string() },
			write: false // set true for actions that mutate/dispatch — gated by allowWriteTools
		},
		async ({ id }) => {
			// resolve services from `scope`, do the work...
			return { content: [{ type: 'text', text: JSON.stringify({ id }) }] }
		}
	)
}
```

Then set `toolPackages: ['medusa-plugin-foo/mcp']`. The registry is duck-typed, so your plugin needs no dependency on `medusa-plugin-mcp`. `medusa-plugin-automation`'s `./mcp` export is a working reference.

## Security

MCP hands an LLM (or any connected MCP client) the ability to read your store's data and — if you enable it — to take **write actions** on the admin's behalf. Treat it accordingly:

- Both `/admin/mcp` and `/admin/chat` require **Medusa admin authentication**; there is no public or token-scoped access.
- **Write tools are disabled by default** (`allowWriteTools: false`). Leave them off unless you need them.
- **Strongly recommended: run this plugin behind [`medusa-plugin-access`](https://pevey.com/medusa-plugin-access).** When it is installed, enabling `allowWriteTools` additionally requires the caller to hold the **`mcp:write`** policy before any write tool runs, so you can grant write access to specific roles only. **Do not enable write tools without access controls in place** — an LLM acting on an admin's behalf should not be able to trigger actions the admin's role wouldn't permit.
- When Medusa ships its official RBAC, this plugin will be updated to respect it as well.
