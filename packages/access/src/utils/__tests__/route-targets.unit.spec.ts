/// <reference types="jest" />
import { requirePolicies, routeTargets } from '../route-guards'

beforeEach(() => {
	;(global as any).AccessRouteGuards = []
})

describe('routeTargets', () => {
	it('extracts the target id from the matched path param', () => {
		requirePolicies({
			matcher: '/admin/widgets/:id',
			method: ['POST'],
			policies: [{ resource: 'widget', operation: 'update' }],
			target: { resource: 'widget', param: 'id' }
		})

		expect(routeTargets('/admin/widgets/wid_123', 'POST')).toEqual(new Map([['widget', 'wid_123']]))
	})

	it('returns nothing for guards without a target or a non-matching method', () => {
		requirePolicies({ matcher: '/admin/widgets/:id', method: ['POST'], policies: [{ resource: 'widget', operation: 'update' }] })
		requirePolicies({
			matcher: '/admin/widgets/:id',
			method: ['DELETE'],
			policies: [{ resource: 'widget', operation: 'delete' }],
			target: { resource: 'widget', param: 'id' }
		})

		expect(routeTargets('/admin/widgets/wid_123', 'POST').size).toBe(0)
	})

	it('binds the declared param on a multi-param matcher — the first, per the derivation convention', () => {
		requirePolicies({
			matcher: '/admin/orders/:id/items/:item_id',
			method: ['POST'],
			policies: [{ resource: 'order', operation: 'update' }],
			target: { resource: 'order', param: 'id' }
		})

		expect(routeTargets('/admin/orders/ord_1/items/item_2', 'POST')).toEqual(new Map([['order', 'ord_1']]))
	})

	it('drops a resource two matched guards bind to different ids — ambiguity fails closed', () => {
		requirePolicies({
			matcher: '/admin/widgets/:id/clones/:clone_id',
			method: ['POST'],
			policies: [{ resource: 'widget', operation: 'update' }],
			target: { resource: 'widget', param: 'id' }
		})
		requirePolicies({
			matcher: '/admin/widgets/:a/clones/:b',
			method: ['POST'],
			policies: [{ resource: 'widget', operation: 'update' }],
			target: { resource: 'widget', param: 'b' }
		})

		expect(routeTargets('/admin/widgets/wid_1/clones/wid_2', 'POST').size).toBe(0)
	})

	it('extracts from a case-folded path, matching the guard regex flags', () => {
		requirePolicies({
			matcher: '/admin/widgets/:id',
			method: ['POST'],
			policies: [{ resource: 'widget', operation: 'update' }],
			target: { resource: 'widget', param: 'id' }
		})

		expect(routeTargets('/Admin/Widgets/wid_123', 'POST')).toEqual(new Map([['widget', 'wid_123']]))
	})

	it('normalizes HEAD to GET like the policy matcher does', () => {
		requirePolicies({
			matcher: '/admin/widgets/:id',
			method: ['GET'],
			policies: [{ resource: 'widget', operation: 'read' }],
			target: { resource: 'widget', param: 'id' }
		})

		expect(routeTargets('/admin/widgets/wid_9', 'HEAD')).toEqual(new Map([['widget', 'wid_9']]))
	})
})
