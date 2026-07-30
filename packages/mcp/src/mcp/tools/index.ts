import { MedusaContainer } from '@medusajs/framework/types'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { createToolRegistry, type McpToolDef } from '../registry'
import { registerQueryTool } from './query'
import { registerOrderTools } from './orders'
import { registerCustomerTools } from './customers'
import { registerProductTools } from './products'
import { registerInventoryTools } from './inventory'
import type { McpPluginOptions } from '../../types'

export type McpActor = { id?: string; type?: string }

/**
 * Build the full, gated list of MCP tools for a request. Used by BOTH the MCP server and the
 * chat route, so neither reaches into SDK internals. Read-only built-ins are always included;
 * additional tools come from packages listed in `options.toolPackages` (each must export
 * `registerMcpTools(registry, scope)`); write tools are gated (see below).
 */
export async function resolveMcpTools(scope: MedusaContainer, options: McpPluginOptions, actor?: McpActor): Promise<McpToolDef[]> {
	const registry = createToolRegistry()

	// Built-in read-only tools (Medusa query API only).
	registerQueryTool(registry, scope)
	registerOrderTools(registry, scope)
	registerCustomerTools(registry, scope)
	registerProductTools(registry, scope)
	registerInventoryTools(registry, scope)

	// Tools contributed by other plugins.
	for (const pkg of options.toolPackages ?? []) {
		try {
			const mod: any = await import(pkg)
			const register = mod.registerMcpTools ?? mod.default?.registerMcpTools
			if (typeof register === 'function') register(registry, scope)
		} catch {
			// package not installed or exposes no MCP tools — skip
		}
	}

	const tools = registry.list()

	// Write-tool gating (#8): OFF by default. When enabled and medusa-plugin-access is installed,
	// each write call additionally requires the caller to hold the `mcp:write` policy.
	if (!options.allowWriteTools) {
		return tools.filter(t => !t.write)
	}
	return gateWriteTools(tools, scope, actor)
}

function gateWriteTools(tools: McpToolDef[], scope: MedusaContainer, actor?: McpActor): McpToolDef[] {
	if (!tools.some(t => t.write)) return tools

	let access: any
	try {
		access = require('medusa-plugin-access')
	} catch {
		// access control not installed — allowWriteTools alone governs.
		return tools
	}
	if (typeof access?.hasPermission !== 'function') return tools

	return tools.map(tool => {
		if (!tool.write) return tool
		return {
			...tool,
			handler: async (args: any) => {
				if (!(await callerHasMcpWrite(access, scope, actor))) {
					return {
						content: [
							{
								type: 'text' as const,
								text: 'Permission denied: this action requires the `mcp:write` access policy.'
							}
						]
					}
				}
				return tool.handler(args)
			}
		}
	})
}

async function callerHasMcpWrite(access: any, scope: MedusaContainer, actor?: McpActor): Promise<boolean> {
	if (!actor?.id) return false
	try {
		const query = scope.resolve(ContainerRegistrationKeys.QUERY)
		const { data } = await query.graph({
			entity: actor.type ?? 'user',
			fields: ['access_roles.id'],
			filters: { id: actor.id }
		})
		const roleIds = ((data?.[0] as any)?.access_roles ?? []).map((r: any) => r.id).filter(Boolean)
		return await access.hasPermission({
			roles: roleIds,
			actions: [{ resource: 'mcp', operation: 'write' }],
			container: scope
		})
	} catch {
		return false
	}
}
