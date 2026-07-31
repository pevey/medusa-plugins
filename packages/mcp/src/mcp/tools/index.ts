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

	// Tools contributed by other plugins. Each entry is an OPTIONAL peer: a given backend
	// may or may not have it installed, so an unresolvable specifier is a normal, silent
	// outcome rather than an error.
	//
	// The catch is narrowed to exactly that case. A package that resolves but blows up while
	// loading — bad export map, version skew, its own missing peer — is a real breakage, and
	// swallowing it made it indistinguishable from "not installed": the tool set would quietly
	// shrink and every diagnostic surface (tools/list, the chat route's tool menu) would look
	// merely configured differently instead of broken.
	//
	// Node reports every unresolvable specifier as ERR_MODULE_NOT_FOUND, including an
	// unexported subpath of a package that IS installed (verified against this Node version) --
	// so `medusa-plugin-automation/mcp` before its export map lands stays silent, which is the
	// desired behaviour. MODULE_NOT_FOUND is the CJS-require spelling of the same condition;
	// it is matched too because a transpiled test build can downlevel `import()` to `require()`.
	// A module that throws at load time carries no `code` at all, so it falls through and logs.
	for (const pkg of options.toolPackages ?? []) {
		try {
			const mod: any = await import(pkg)
			const register = mod.registerMcpTools ?? mod.default?.registerMcpTools
			if (typeof register === 'function') register(registry, scope)
		} catch (err: any) {
			if (err?.code === 'ERR_MODULE_NOT_FOUND' || err?.code === 'MODULE_NOT_FOUND') continue
			logWarn(scope, `[MCP] tool package "${pkg}" is installed but failed to load; its tools are unavailable: ${err?.message ?? err}`)
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

/** Warn through Medusa's logger, falling back to console if it isn't registered (e.g. a bare test scope). */
function logWarn(scope: MedusaContainer, message: string): void {
	try {
		;(scope.resolve(ContainerRegistrationKeys.LOGGER) as any).warn(message)
	} catch {
		console.warn(message)
	}
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
