# medusa-plugin-mcp

MCP server and LLM chat plugin for Medusa v2. Exposes your store's data and operations to LLMs as tools over the Model Context Protocol, and adds an admin chat page that talks to Anthropic, OpenAI, or Ollama.

[Documentation](https://pevey.com/medusa-plugin-mcp)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- **MCP server** over streamable-HTTP at `POST /admin/mcp`, built on the official `@modelcontextprotocol/sdk`. Point any MCP client (for example Claude Desktop) at it to give an assistant read access to your store.
- **Built-in tools** for querying Medusa — a generic graph `query` plus focused tools for orders, customers, products, and inventory.
- **Admin Chat page** — converse with an LLM that calls those tools to answer questions about your store, right inside the Medusa admin.
- **Pluggable LLM provider** — Anthropic, OpenAI, or Ollama, chosen in config.
- **Optional plugin tools** — when `medusa-plugin-automation` is installed, its automation tools are added automatically.

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
				provider: 'anthropic', // 'anthropic' | 'openai' | 'ollama'
				model: 'claude-sonnet-4-5', // a model id for the chosen provider
				apiKey: process.env.MCP_LLM_API_KEY, // required for anthropic/openai; omit for ollama
				baseUrl: process.env.MCP_LLM_BASE_URL, // optional; custom base URL, or the Ollama host
				systemPrompt: 'Extra instructions for the assistant.' // optional
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
| `provider` | `'anthropic' \| 'openai' \| 'ollama'` | **yes** | Which LLM backend to use. |
| `model` | `string` | **yes** | A model id for the chosen provider. |
| `apiKey` | `string` | Required for `anthropic` / `openai` | API key for the provider. Not needed for `ollama`. |
| `baseUrl` | `string` | no | Custom API base URL. For `ollama` this is the host. |
| `systemPrompt` | `string` | no | Appended to the plugin's built-in system prompt. |

Without `provider`, `model`, and (for cloud providers) `apiKey`, the chat endpoint returns an error.

## The admin chat

Open **Chat** from the Medusa admin sidebar (`/app/chat`). Ask about your store — the assistant runs an LLM tool-use loop, calling the built-in tools as needed, and each tool call is shown inline (name, arguments, and result) beneath the reply.

Notes:

- Replies are returned as a single response — there is no token-by-token streaming.
- Conversations are held in the page only; there is no server-side chat history, so navigating away or reloading starts fresh.

## The MCP server

The MCP server is exposed over **streamable-HTTP** at `POST /admin/mcp`. To connect an external MCP client:

- Point it at `<your-backend>/admin/mcp`.
- Authenticate as a Medusa admin — the endpoint is admin-only, so send a valid admin session cookie or admin API token. There is no separate MCP token.
- The client sends an `initialize` request, then reuses the returned `mcp-session-id` header on subsequent calls.

The server advertises the MCP **tools** capability (`tools/list`, `tools/call`); it does not serve resources or prompts.

## Available tools

Always available:

- `query` — run a Medusa graph query over an allow-list of core entities.
- `recent_orders`, `get_order`
- `search_customers`, `get_customer`
- `search_products`, `get_product`
- `low_stock_items`, `get_inventory_item`

Added automatically when `medusa-plugin-automation` is installed:

- `list_automations`, `get_automation`, `list_automation_deliveries`, `trigger_automation`, `retry_deliveries`

## Security

Both `/admin/mcp` and `/admin/chat` require Medusa admin authentication — there is no public or token-scoped access, and no per-tool permission layer. Most tools are read-only, but the automation tools `trigger_automation` and `retry_deliveries` perform actions. Only grant MCP/chat access to trusted admins, and be mindful of what any connected LLM can do on their behalf.
