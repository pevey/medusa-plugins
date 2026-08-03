/**
 * Hand-written gap-fillers for the pinned core route map.
 *
 * `core-route-policies.ts` is a faithful harvest of the `policies:[]` core
 * declares for itself, and is regenerated wholesale — nothing hand-written can
 * live there. But core's own declarations have holes, and two kinds of hole are
 * security-relevant:
 *
 *  1. **State-changing routes core never declared at all.** They fall through to
 *     whatever subtree floor happens to cover them, or to nothing.
 *  2. **State-changing routes covered only by a read floor.** A `POST` matched
 *     solely by `/admin/products/*` → `product:read` is gated at read: an actor
 *     who can view products can also edit them. Twenty-four routes were in this
 *     state at 2.18.0, including `POST /admin/products/:id`.
 *
 * Declarations AND together, so every entry here *tightens*: the read floor
 * still applies and this adds the write grant on top. Regenerating the core map
 * never touches this file.
 *
 * Writes only, matching the spec's scope. Reads that core leaves undeclared
 * stay undeclared: no existing role holds a grant for them, so declaring them
 * would deny dashboard chrome to every non-wildcard admin on upgrade.
 *
 * Deliberately NOT gated at all:
 *  - `POST /admin/invites/accept` — the actor accepting an invite has no roles
 *    yet by definition. Gating it would make invite acceptance require the
 *    permission that acceptance exists to grant.
 *
 * Multi-operation entries AND, matching how core writes its own batch
 * declarations (`/admin/products/batch` → `['create', 'update']`).
 */
export type SupplementalRoutePolicy = {
	matcher: string
	methods: string[]
	policies: { resource: string; operation: string | string[] }[]
}

export const supplementalRoutePolicies: SupplementalRoutePolicy[] = [
	// --- Products: core declares DELETE but not the update/import/export writes.
	{ matcher: '/admin/products/:id', methods: ['POST'], policies: [{ resource: 'product', operation: 'update' }] },
	{ matcher: '/admin/products/export', methods: ['POST'], policies: [{ resource: 'product', operation: 'export' }] },
	{ matcher: '/admin/products/import', methods: ['POST'], policies: [{ resource: 'product', operation: ['create', 'update'] }] },
	{ matcher: '/admin/products/imports', methods: ['POST'], policies: [{ resource: 'product', operation: ['create', 'update'] }] },
	{ matcher: '/admin/products/import/:transaction_id/confirm', methods: ['POST'], policies: [{ resource: 'product', operation: ['create', 'update'] }] },
	{ matcher: '/admin/products/imports/:transaction_id/confirm', methods: ['POST'], policies: [{ resource: 'product', operation: ['create', 'update'] }] },
	{ matcher: '/admin/products/:id/variants/:variant_id', methods: ['POST'], policies: [{ resource: 'product_variant', operation: 'update' }] },
	{ matcher: '/admin/products/:id/variants/:variant_id/images/batch', methods: ['POST'], policies: [{ resource: 'product_variant', operation: 'update' }] },
	{ matcher: '/admin/products/:id/images/:image_id/variants/batch', methods: ['POST'], policies: [{ resource: 'product_variant', operation: 'update' }] },

	// --- Draft orders: the whole edit surface sits under the order:read floor.
	{ matcher: '/admin/draft-orders/:id', methods: ['DELETE'], policies: [{ resource: 'order', operation: 'delete' }] },
	{ matcher: '/admin/draft-orders/:id/edit', methods: ['POST', 'DELETE'], policies: [{ resource: 'order', operation: 'update' }] },
	{ matcher: '/admin/draft-orders/:id/edit/confirm', methods: ['POST'], policies: [{ resource: 'order', operation: 'update' }] },
	{ matcher: '/admin/draft-orders/:id/edit/request', methods: ['POST'], policies: [{ resource: 'order', operation: 'update' }] },
	{ matcher: '/admin/draft-orders/:id/edit/items/:action_id', methods: ['DELETE'], policies: [{ resource: 'order', operation: 'update' }] },
	{ matcher: '/admin/draft-orders/:id/edit/shipping-methods/:action_id', methods: ['DELETE'], policies: [{ resource: 'order', operation: 'update' }] },
	{ matcher: '/admin/draft-orders/:id/edit/shipping-methods/method/:method_id', methods: ['DELETE'], policies: [{ resource: 'order', operation: 'update' }] },

	// --- Deletes core left at a read floor.
	{ matcher: '/admin/inventory-items/:id', methods: ['DELETE'], policies: [{ resource: 'inventory_item', operation: 'delete' }] },
	{ matcher: '/admin/price-lists/:id', methods: ['DELETE'], policies: [{ resource: 'price_list', operation: 'delete' }] },
	{ matcher: '/admin/tax-rates/:id', methods: ['DELETE'], policies: [{ resource: 'tax_rate', operation: 'delete' }] },

	// --- Workflow executions: running a workflow is not a read.
	{ matcher: '/admin/workflows-executions/:workflow_id/run', methods: ['POST'], policies: [{ resource: 'workflow_execution', operation: 'create' }] },
	{
		matcher: '/admin/workflows-executions/:workflow_id/steps/success',
		methods: ['POST'],
		policies: [{ resource: 'workflow_execution', operation: 'update' }]
	},
	{
		matcher: '/admin/workflows-executions/:workflow_id/steps/failure',
		methods: ['POST'],
		policies: [{ resource: 'workflow_execution', operation: 'update' }]
	},

	// --- Admin surfaces core ships undeclared entirely. Writes only: gating the
	// reads too would be tidier, but no existing role holds `view:read` or
	// `layout:read`, so it would blank the dashboard's saved views and layout
	// chrome for every non-wildcard admin on upgrade. Reads here are UI
	// configuration, not tenant data.
	{ matcher: '/admin/views/:entity/configurations', methods: ['POST'], policies: [{ resource: 'view', operation: 'create' }] },
	{ matcher: '/admin/views/:entity/configurations/:id', methods: ['POST'], policies: [{ resource: 'view', operation: 'update' }] },
	{ matcher: '/admin/views/:entity/configurations/:id', methods: ['DELETE'], policies: [{ resource: 'view', operation: 'delete' }] },
	{ matcher: '/admin/views/:entity/configurations/active', methods: ['POST'], policies: [{ resource: 'view', operation: 'update' }] },

	{ matcher: '/admin/layouts/:zone/configuration', methods: ['POST'], policies: [{ resource: 'layout', operation: 'update' }] },
	{ matcher: '/admin/layouts/:zone/configuration', methods: ['DELETE'], policies: [{ resource: 'layout', operation: 'delete' }] },

	{ matcher: '/admin/property-labels', methods: ['POST'], policies: [{ resource: 'property_label', operation: 'create' }] },
	{ matcher: '/admin/property-labels/batch', methods: ['POST'], policies: [{ resource: 'property_label', operation: ['create', 'update', 'delete'] }] },
	{ matcher: '/admin/property-labels/:id', methods: ['POST'], policies: [{ resource: 'property_label', operation: 'update' }] },
	{ matcher: '/admin/property-labels/:id', methods: ['DELETE'], policies: [{ resource: 'property_label', operation: 'delete' }] },

	{ matcher: '/admin/index/sync', methods: ['POST'], policies: [{ resource: 'search_index', operation: 'update' }] },

	// Core's own RBAC admin surface. Gated so it is not writable by any
	// authenticated admin; nothing here depends on core RBAC being enabled.
	{ matcher: '/admin/rbac/roles', methods: ['POST'], policies: [{ resource: 'rbac_role', operation: 'create' }] }
]
