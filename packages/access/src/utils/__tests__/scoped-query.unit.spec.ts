import { ACCESS_UNSCOPED_QUERY, createScopedQuery, enforcementSatisfied, AccessEnforcement, resolveUnscopedQuery } from '../scoped-query'

jest.mock('@medusajs/framework/modules-sdk', () => ({
	MedusaModule: {
		getAllJoinerConfigs: () => [
			{ serviceName: 'customer', alias: [{ name: ['customer', 'customers'], entity: 'Customer' }] },
			{ serviceName: 'currency', alias: [{ name: ['currency', 'currencies'], entity: 'Currency' }] }
		]
	}
}))

const makeOriginal = () => {
	const graph = jest.fn().mockResolvedValue({ data: [{ id: 'cus_1' }], metadata: { count: 1, skip: 0, take: 20 } })
	const gql = jest.fn().mockResolvedValue([])
	const index = jest.fn().mockResolvedValue({ data: [] })
	const callable: any = jest.fn().mockResolvedValue([])
	callable.graph = graph
	callable.gql = gql
	callable.index = index
	return callable
}

const makeEnforcement = (required: string[]): AccessEnforcement => ({
	required: new Set(required),
	narrowed: new Set(),
	asserted: new Set()
})

const wrap = (original: any, enforcement: AccessEnforcement, filters = new Map([['customer', { company_id: 'comp_1' } as Record<string, unknown>]])) =>
	createScopedQuery({ original, filters, enforcement })

describe('createScopedQuery — graph', () => {
	it('injects the scope filter into a scoped root and marks it narrowed', async () => {
		const original = makeOriginal()
		const enforcement = makeEnforcement(['customer'])
		const scoped = wrap(original, enforcement)

		await scoped.graph({ entity: 'customers', fields: ['id'], filters: { email: 'a@b.co' } })

		expect(original.graph).toHaveBeenCalledWith({ entity: 'customers', fields: ['id'], filters: { email: 'a@b.co', company_id: 'comp_1' } })
		expect(enforcement.narrowed.has('customer')).toBe(true)
	})

	it('does not mutate the caller-supplied queryOptions', async () => {
		const original = makeOriginal()
		const queryOptions = { entity: 'customer', fields: ['id'], filters: { email: 'a@b.co' } }
		await wrap(original, makeEnforcement(['customer'])).graph(queryOptions)

		expect(queryOptions.filters).toEqual({ email: 'a@b.co' })
	})

	it('passes an unscoped root through untouched, without marking', async () => {
		const original = makeOriginal()
		const enforcement = makeEnforcement(['customer'])
		await wrap(original, enforcement).graph({ entity: 'currency', fields: ['code'] })

		expect(original.graph).toHaveBeenCalledWith({ entity: 'currency', fields: ['code'] })
		expect(enforcement.narrowed.size).toBe(0)
	})

	it('short-circuits an empty intersection without calling the original', async () => {
		const original = makeOriginal()
		const enforcement = makeEnforcement(['customer'])
		const result = await wrap(original, enforcement, new Map([['customer', { id: ['cus_1'] }]])).graph({
			entity: 'customer',
			fields: ['id'],
			filters: { id: 'cus_9' },
			pagination: { skip: 0, take: 20 }
		})

		expect(original.graph).not.toHaveBeenCalled()
		expect(result).toEqual({ data: [], metadata: { count: 0, skip: 0, take: 20 } })
		expect(enforcement.narrowed.has('customer')).toBe(true)
	})

	it('honors throwIfKeyNotFound on an empty short-circuit', async () => {
		const original = makeOriginal()
		await expect(
			wrap(original, makeEnforcement(['customer']), new Map([['customer', { id: ['cus_1'] }]])).graph(
				{ entity: 'customer', fields: ['id'], filters: { id: 'cus_9' } },
				{ throwIfKeyNotFound: true }
			)
		).rejects.toMatchObject({ type: 'not_found' })
	})

	it('denies an unmergeable collision', async () => {
		const original = makeOriginal()
		await expect(
			wrap(original, makeEnforcement(['customer'])).graph({ entity: 'customer', fields: ['id'], filters: { company_id: { $ne: 'comp_2' } } })
		).rejects.toMatchObject({ type: 'forbidden' })
		expect(original.graph).not.toHaveBeenCalled()
	})

	it('denies graph with an unknown entity', async () => {
		const original = makeOriginal()
		await expect(wrap(original, makeEnforcement(['customer'])).graph({ entity: 'warehouse', fields: ['id'] })).rejects.toMatchObject({ type: 'forbidden' })
		expect(original.graph).not.toHaveBeenCalled()
	})

	it('forwards rest arguments when injecting the scope filter', async () => {
		const original = makeOriginal()
		const enforcement = makeEnforcement(['customer'])
		const scoped = wrap(original, enforcement)

		await scoped.graph({ entity: 'customer', fields: ['id'] }, { throwIfKeyNotFound: true })

		expect(original.graph).toHaveBeenCalledWith({ entity: 'customer', fields: ['id'], filters: { company_id: 'comp_1' } }, { throwIfKeyNotFound: true })
	})
})

describe('createScopedQuery — unfilterable entry points', () => {
	it('denies gql outright while scopes are active', async () => {
		await expect(wrap(makeOriginal(), makeEnforcement(['customer'])).gql('query { customer { id } }')).rejects.toMatchObject({ type: 'forbidden' })
	})

	it('denies index on a scoped root and passes it on an unscoped root', async () => {
		const original = makeOriginal()
		const scoped = wrap(original, makeEnforcement(['customer']))

		await expect(scoped.index({ entity: 'customer', fields: ['id'] })).rejects.toMatchObject({ type: 'forbidden' })
		await scoped.index({ entity: 'currency', fields: ['code'] })
		expect(original.index).toHaveBeenCalledTimes(1)
	})

	it('denies index with an unknown entity', async () => {
		const original = makeOriginal()
		await expect(wrap(original, makeEnforcement(['customer'])).index({ entity: 'warehouse', fields: ['id'] })).rejects.toMatchObject({ type: 'forbidden' })
		expect(original.index).not.toHaveBeenCalled()
	})

	it('denies the callable on a scoped or unparseable root, passes it on an unscoped root', async () => {
		const original = makeOriginal()
		const scoped = wrap(original, makeEnforcement(['customer']))

		await expect(scoped({ entity: 'customers', fields: ['id'] })).rejects.toMatchObject({ type: 'forbidden' })
		await expect(scoped({ __value: {} })).rejects.toMatchObject({ type: 'forbidden' })
		await scoped({ entryPoint: 'currency', fields: ['code'] })
		expect(original).toHaveBeenCalledTimes(1)
	})

	it('denies the callable when a root cannot be canonicalized', async () => {
		const original = makeOriginal()
		await expect(wrap(original, makeEnforcement(['customer']))({ entryPoint: 'warehouse', fields: ['id'] })).rejects.toMatchObject({ type: 'forbidden' })
		expect(original).not.toHaveBeenCalled()
	})
})

describe('enforcementSatisfied', () => {
	it('requires every required resource to be narrowed or asserted', () => {
		const enforcement = makeEnforcement(['customer', 'order'])
		expect(enforcementSatisfied(enforcement)).toBe(false)
		enforcement.narrowed.add('customer')
		expect(enforcementSatisfied(enforcement)).toBe(false)
		enforcement.asserted.add('order')
		expect(enforcementSatisfied(enforcement)).toBe(true)
	})
})

describe('resolveUnscopedQuery', () => {
	it('resolves ACCESS_UNSCOPED_QUERY when the container has hasRegistration and it returns true for that key', () => {
		const unscopedQuery = { graph: jest.fn() }
		const scopedQuery = { graph: jest.fn() }
		const container = {
			hasRegistration: jest.fn((key: string) => key === 'access_unscoped_query'),
			resolve: jest.fn((key: string) => (key === 'access_unscoped_query' ? unscopedQuery : scopedQuery))
		} as any

		const result = resolveUnscopedQuery(container)

		expect(container.resolve).toHaveBeenCalledWith('access_unscoped_query')
		expect(result).toBe(unscopedQuery)
	})

	it('falls back to resolving QUERY when the container has no hasRegistration method', () => {
		const scopedQuery = { graph: jest.fn() }
		const container = {
			resolve: jest.fn(() => scopedQuery)
		} as any

		const result = resolveUnscopedQuery(container)

		expect(container.resolve).toHaveBeenCalledWith('query')
		expect(result).toBe(scopedQuery)
	})
})

describe('pre-query field pruning', () => {
	const enforcement = () => ({ required: new Set(['customer']), narrowed: new Set<string>(), asserted: new Set<string>() })
	const filters = () => new Map([['customer', { owner_id: 'u_1' }]])

	it('removes pruned paths from the selection the underlying query receives', async () => {
		const graph = jest.fn(async () => ({ data: [] }))
		const query = createScopedQuery({
			original: { graph },
			filters: filters(),
			enforcement: enforcement(),
			pruneFields: async (_root, fields) => fields.filter(f => f !== 'secret.value')
		})

		await query.graph({ entity: 'customer', fields: ['id', 'secret.value'] })

		// The point of pruning: the restricted path never reaches the database,
		// rather than being fetched and stripped off the response afterwards.
		expect(graph.mock.calls[0][0].fields).toEqual(['id'])
	})

	it('leaves the selection alone when nothing is pruned', async () => {
		const graph = jest.fn(async () => ({ data: [] }))
		const query = createScopedQuery({
			original: { graph },
			filters: filters(),
			enforcement: enforcement(),
			pruneFields: async (_root, fields) => fields
		})

		await query.graph({ entity: 'customer', fields: ['id', 'name'] })

		expect(graph.mock.calls[0][0].fields).toEqual(['id', 'name'])
	})

	it('keeps the original selection when a pruner faults, leaving the post-query strip to cover it', async () => {
		const graph = jest.fn(async () => ({ data: [] }))
		const query = createScopedQuery({
			original: { graph },
			filters: filters(),
			enforcement: enforcement(),
			pruneFields: async () => {
				throw new Error('resolver down')
			}
		})

		await query.graph({ entity: 'customer', fields: ['id', 'secret.value'] })

		expect(graph.mock.calls[0][0].fields).toEqual(['id', 'secret.value'])
	})

	it('keeps the original selection rather than issuing a query that selects nothing', async () => {
		const graph = jest.fn(async () => ({ data: [] }))
		const query = createScopedQuery({
			original: { graph },
			filters: filters(),
			enforcement: enforcement(),
			pruneFields: async () => []
		})

		await query.graph({ entity: 'customer', fields: ['id'] })

		expect(graph.mock.calls[0][0].fields).toEqual(['id'])
	})

	it('does not prune a query on an unscoped root', async () => {
		const graph = jest.fn(async () => ({ data: [] }))
		const pruneFields = jest.fn(async (_root: string, fields: string[]) => fields)
		const query = createScopedQuery({ original: { graph }, filters: filters(), enforcement: enforcement(), pruneFields })

		await query.graph({ entity: 'currency', fields: ['id'] })

		expect(pruneFields).not.toHaveBeenCalled()
	})

	it('still narrows rows when no pruner is supplied', async () => {
		const graph = jest.fn(async () => ({ data: [] }))
		const query = createScopedQuery({ original: { graph }, filters: filters(), enforcement: enforcement() })

		await query.graph({ entity: 'customer', fields: ['id'] })

		expect(graph.mock.calls[0][0].filters).toMatchObject({ owner_id: 'u_1' })
		expect(graph.mock.calls[0][0].fields).toEqual(['id'])
	})
})
