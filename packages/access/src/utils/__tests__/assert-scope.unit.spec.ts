/// <reference types="jest" />
import { assertScope } from '../assert-scope'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'

const makeReq = (enforcement: any, graphResult: any[], options?: { skipNarrowing?: boolean }) => {
	const graph = jest.fn().mockImplementation(async () => {
		if (!options?.skipNarrowing && enforcement) {
			enforcement.narrowed.add('widget')
		}
		return { data: graphResult }
	})
	const resolve = jest.fn().mockReturnValue({ graph })
	return {
		req: { accessEnforcement: enforcement, scope: { resolve } } as any,
		graph,
		resolve
	}
}

describe('assertScope', () => {
	it('is a no-op when the resource is not actively scoped', async () => {
		const { req, graph } = makeReq(undefined, [])
		await assertScope(req, { resource: 'widget', id: 'w_1' })
		expect(graph).not.toHaveBeenCalled()
	})

	it('marks the resource asserted when every id is in scope', async () => {
		const enforcement = { required: new Set(['widget']), narrowed: new Set(), asserted: new Set() }
		const { req, graph, resolve } = makeReq(enforcement, [{ id: 'w_1' }, { id: 'w_2' }])

		await assertScope(req, { resource: 'widget', id: ['w_1', 'w_2', 'w_1'] })

		expect(resolve).toHaveBeenCalledWith(ContainerRegistrationKeys.QUERY)
		expect(graph).toHaveBeenCalledWith({ entity: 'widget', fields: ['id'], filters: { id: ['w_1', 'w_2'] } })
		expect(enforcement.asserted.has('widget')).toBe(true)
	})

	it('throws NOT_FOUND when an id is outside the scope', async () => {
		const enforcement = { required: new Set(['widget']), narrowed: new Set(), asserted: new Set() }
		const { req } = makeReq(enforcement, [{ id: 'w_1' }])

		await expect(assertScope(req, { resource: 'widget', id: ['w_1', 'w_9'] })).rejects.toMatchObject({ type: 'not_found' })
		expect(enforcement.asserted.has('widget')).toBe(false)
	})

	it('throws FORBIDDEN when the scope filter was not applied', async () => {
		const enforcement = { required: new Set(['widget']), narrowed: new Set(), asserted: new Set() }
		const { req } = makeReq(enforcement, [{ id: 'w_1' }], { skipNarrowing: true })

		await expect(assertScope(req, { resource: 'widget', id: 'w_1' })).rejects.toMatchObject({ type: 'forbidden' })
		expect(enforcement.asserted.size).toBe(0)
	})

	it('is a no-op when enforcement is present but resource is not in required', async () => {
		const enforcement = { required: new Set(['other']), narrowed: new Set(), asserted: new Set() }
		const { req, graph } = makeReq(enforcement, [])

		await assertScope(req, { resource: 'widget', id: 'w_1' })

		expect(graph).not.toHaveBeenCalled()
		expect(enforcement.asserted.size).toBe(0)
	})

	it('converts a string id to an array', async () => {
		const enforcement = { required: new Set(['widget']), narrowed: new Set(), asserted: new Set() }
		const { req, graph } = makeReq(enforcement, [{ id: 'w_1' }])

		await assertScope(req, { resource: 'widget', id: 'w_1' })

		expect(graph).toHaveBeenCalledWith({ entity: 'widget', fields: ['id'], filters: { id: ['w_1'] } })
		expect(enforcement.asserted.has('widget')).toBe(true)
	})
})
