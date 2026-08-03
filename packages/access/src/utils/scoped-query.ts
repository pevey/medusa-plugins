import { MedusaContainer, RemoteQueryFunction } from '@medusajs/framework/types'
import { ContainerRegistrationKeys, MedusaError } from '@medusajs/framework/utils'
import { canonicalQueryRoot, extractQueryRoots } from './query-roots'
import { mergeScopeFilter } from './scope-filters'

export const ACCESS_UNSCOPED_QUERY = 'access_unscoped_query'

export function resolveUnscopedQuery(container: MedusaContainer): Omit<RemoteQueryFunction, symbol> {
	return typeof container.hasRegistration === 'function' && container.hasRegistration(ACCESS_UNSCOPED_QUERY)
		? container.resolve(ACCESS_UNSCOPED_QUERY)
		: container.resolve(ContainerRegistrationKeys.QUERY)
}

export type AccessEnforcement = {
	required: Set<string>
	narrowed: Set<string>
	asserted: Set<string>
}

export function enforcementSatisfied(enforcement: AccessEnforcement): boolean {
	return [...enforcement.required].every(resource => enforcement.narrowed.has(resource) || enforcement.asserted.has(resource))
}

function deny(detail: string): never {
	throw new MedusaError(MedusaError.Types.FORBIDDEN, `Insufficient permissions (${detail})`)
}

/**
 * Drop the field paths a scoped actor may not read from a query's selection,
 * before it runs. Supplied by the guard, which owns the permission context;
 * this module stays free of it.
 */
export type FieldPruner = (root: string, fields: string[]) => Promise<string[]>

export function createScopedQuery(input: {
	original: any
	filters: Map<string, Record<string, unknown>>
	enforcement: AccessEnforcement
	pruneFields?: FieldPruner
}): any {
	const { original, filters, enforcement, pruneFields } = input

	function canonicalRootOf(name: unknown): string {
		if (typeof name !== 'string') deny('unparseable query root while a scoped grant is active')
		const canonical = canonicalQueryRoot(name)
		if (!canonical) deny(`unrecognized query root "${name}" while a scoped grant is active`)
		return canonical
	}

	async function pruneRequestedFields(root: string, requested: unknown): Promise<string[] | undefined> {
		if (!pruneFields || !Array.isArray(requested) || !requested.length) {
			return undefined
		}
		try {
			const kept = await pruneFields(root, requested)
			// Everything pruned would mean a query selecting nothing. An actor who
			// cannot read the root at all is already refused at the door, so treat
			// this as a resolution fault and leave the selection alone.
			return kept.length ? kept : requested
		} catch {
			// Fail open, deliberately: pruning is an optimisation over the post-query
			// strip, which still runs on the response. A pruning fault costs a wider
			// fetch, not a wider response.
			return undefined
		}
	}

	const graph = async (...args: any[]) => {
		const [queryOptions, ...rest] = args
		const root = canonicalRootOf(queryOptions?.entity)
		if (!filters.has(root)) return original.graph(...args)

		const merge = mergeScopeFilter(queryOptions.filters, filters.get(root)!)
		if (merge.kind === 'unmergeable') {
			deny(`scope filter for "${root}" cannot be combined with the query's "${merge.key}" filter`)
		}
		enforcement.narrowed.add(root)
		if (merge.kind === 'empty') {
			if (rest[0]?.throwIfKeyNotFound) {
				throw new MedusaError(MedusaError.Types.NOT_FOUND, `${root} was not found`)
			}
			const pagination = queryOptions.pagination
			return { data: [], metadata: pagination ? { count: 0, skip: pagination.skip ?? 0, take: pagination.take } : undefined }
		}
		const fields = await pruneRequestedFields(root, queryOptions.fields)

		return original.graph({ ...queryOptions, filters: merge.filters, ...(fields ? { fields } : {}) }, ...rest)
	}

	const index = async (...args: any[]) => {
		const root = canonicalRootOf(args[0]?.entity)
		if (filters.has(root)) deny(`query.index cannot apply the row filter for "${root}"`)
		return original.index(...args)
	}

	const gql = async (...args: any[]) => {
		deny('query.gql cannot apply row filters while a scoped grant is active')
		return original.gql(...args)
	}

	const callable: any = async (...args: any[]) => {
		const roots = extractQueryRoots(args[0])
		if (!roots) deny('unparseable query shape while a scoped grant is active')
		for (const name of roots) {
			const canonical = canonicalRootOf(name)
			if (filters.has(canonical)) deny(`remote query on "${canonical}" cannot apply the row filter — use query.graph`)
		}
		return original(...args)
	}

	callable.graph = graph
	callable.index = index
	callable.gql = gql
	return callable
}
