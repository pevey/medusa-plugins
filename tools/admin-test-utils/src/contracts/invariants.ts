import type { ContractMap } from './load.js'

export type ContractInvariantInput = {
	contracts: ContractMap
	/** `import * as validators from '../../api/validators'` */
	validators: Record<string, unknown>
	/** Fields the admin UI reads, keyed by `"METHOD /matcher"`. */
	declaredFields?: Record<string, string[]>
}

export function assertContractInvariants(input: ContractInvariantInput): void {
	const problems: string[] = []

	// 1. Every exported schema is wired to at least one route. Catches a validator that was
	//    written (or kept) but never reached — dead contract surface.
	const wired = new Set<unknown>()
	for (const contract of input.contracts.all()) {
		if (contract.bodySchema) wired.add(contract.bodySchema)
		if (contract.querySchema) wired.add(contract.querySchema)
	}
	for (const [name, schema] of Object.entries(input.validators)) {
		if (name.endsWith('Type')) continue // co-located `z.infer` type aliases
		if (!schema || typeof schema !== 'object') continue
		if (!wired.has(schema)) {
			problems.push(`validator "${name}" is exported but not wired to any route`)
		}
	}

	// 2. Route defaultLimit must agree with the schema's own createFindParams limit, or the
	//    UI's page math silently disagrees with what the server returns.
	for (const contract of input.contracts.all()) {
		const { defaultLimit } = contract.queryConfig ?? {}
		if (defaultLimit === undefined || !contract.querySchema) continue
		const parsed = contract.querySchema.safeParse({})
		const schemaLimit = (parsed.data as { limit?: number } | undefined)?.limit
		if (schemaLimit !== undefined && schemaLimit !== defaultLimit) {
			problems.push(
				`${contract.method} ${contract.matcher}: queryConfig.defaultLimit is ${defaultLimit} ` +
					`but the schema defaults limit to ${schemaLimit}`
			)
		}
	}

	// 3. Fields the UI reads must be a subset of what the route returns.
	for (const [key, fields] of Object.entries(input.declaredFields ?? {})) {
		const [method, matcher] = key.split(' ')
		const contract = input.contracts.all().find(c => c.method === method && c.matcher === matcher)
		if (!contract) {
			problems.push(`declaredFields key "${key}" matches no route`)
			continue
		}
		const available = new Set((contract.queryConfig?.defaults ?? []).map(f => f.split('.')[0]))
		for (const field of fields) {
			if (!available.has(field.split('.')[0])) {
				problems.push(`${key}: UI reads "${field}" but queryConfig.defaults does not include it`)
			}
		}
	}

	if (problems.length > 0) {
		throw new Error(`[admin-test-utils] contract invariants failed:\n  - ${problems.join('\n  - ')}`)
	}
}
