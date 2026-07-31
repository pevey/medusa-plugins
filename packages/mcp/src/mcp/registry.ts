import type { ZodObject, ZodRawShape } from 'zod'

export type McpToolHandler = (args: any) => Promise<{ content: { type: 'text'; text: string }[] }>

export type McpToolConfig = {
	description: string
	/**
	 * A Zod **object schema** (`z.object({ ... })`), not a raw shape.
	 *
	 * MCP SDK v2 deprecated the raw-shape form of `registerTool` in favour of passing a schema
	 * directly, so the registry mirrors the supported shape rather than the deprecated one. Tool
	 * packages contributing through `registerMcpTools` therefore hand over a schema they already
	 * own, which also lets them use refinements/transforms that a bare shape cannot express.
	 */
	inputSchema: ZodObject<ZodRawShape>
	/** Marks a tool that performs a write/dispatch action (gated — see options.allowWriteTools). */
	write?: boolean
}

export type McpToolDef = McpToolConfig & {
	name: string
	handler: McpToolHandler
}

/**
 * Collects tool definitions. Its `registerTool(name, config, handler)` signature mirrors the
 * MCP SDK's, so a tool module can register against either. This registry is what both the MCP
 * server and the chat route read from — no reaching into SDK internals — and it's the surface a
 * plugin implements to contribute tools (`registerMcpTools(registry, scope)`).
 */
export interface McpToolRegistry {
	registerTool(name: string, config: McpToolConfig, handler: McpToolHandler): void
	list(): McpToolDef[]
}

export function createToolRegistry(): McpToolRegistry {
	const tools: McpToolDef[] = []
	return {
		registerTool(name, config, handler) {
			tools.push({ name, ...config, handler })
		},
		list() {
			return tools
		}
	}
}
