import { MedusaContainer } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'
import { rearmWarnings } from './warn-once'

export type ScopeActor = { id: string; type: string }

/**
 * Yields a ROOT-LEVEL query filter. Medusa's query layer prunes filters on
 * expand nodes, so a scope that can only be expressed as a nested filter cannot
 * be enforced. Resolve the relationship to an id list here and filter on a
 * column the resource itself carries.
 */
export type ScopeFilter = (actor: ScopeActor, container: MedusaContainer) => Promise<Record<string, unknown>>

declare global {
	// eslint-disable-next-line no-var
	var AccessScopes: Map<string, Map<string, ScopeFilter>> | undefined
}

global.AccessScopes ??= new Map()

export function defineScope(input: { name: string; resource: string; filter: ScopeFilter }): void {
	let byName = global.AccessScopes!.get(input.resource)
	if (!byName) {
		byName = new Map()
		global.AccessScopes!.set(input.resource, byName)
	}
	if (byName.has(input.name)) {
		throw new MedusaError(MedusaError.Types.INVALID_DATA, `defineScope: "${input.resource}:${input.name}" is already registered.`)
	}
	byName.set(input.name, input.filter)

	// Registering a scope is how an operator fixes an unenforceable or
	// non-canonical scope warning, so let those warn again — otherwise a
	// process-lifetime dedupe leaves a fixed configuration indistinguishable
	// from an unfixed one until restart.
	rearmWarnings('unenforceable-scope')
	rearmWarnings('non-canonical-scope')
}

export function getScope(resource: string, name: string): ScopeFilter | undefined {
	return global.AccessScopes!.get(resource)?.get(name)
}

export function hasScope(resource: string, name: string): boolean {
	return global.AccessScopes!.get(resource)?.has(name) ?? false
}
