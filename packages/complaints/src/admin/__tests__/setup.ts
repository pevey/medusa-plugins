import { vi } from 'vitest'
import { validateAndTransformQuery, validateAndTransformBody } from '@medusajs/framework/http'
import { loadRouteContracts, createContractFake, type ContractFake, type Responder } from 'medusa-admin-test-utils'
import * as V from '../../api/validators'
import type { AdminComplaint, AdminComplaintActivity, AdminComplaintTag } from '../types'

// Discovers routes from the real file tree so a route needs no entry below just to be visible
// here. Read as raw text, NOT executed: a route.ts pulls in `@medusajs/framework/utils` ->
// `jsonwebtoken`, which calls `util.inherits` and crashes the whole suite import once Vite
// externalizes Node's `util` for the browser. `loadRouteContracts` recovers the exported HTTP
// verbs by regex over the source text instead.
const routeModules = import.meta.glob('../../api/admin/**/route.ts', { eager: true, query: '?raw', import: 'default' })

// DEVIATES from the standard template, which does `import middlewares from '../../api/middlewares'`.
// complaints/src/api/middlewares.ts has a soft integration with medusa-plugin-access: at module
// top level it does `require('medusa-plugin-access')` inside a try/catch, so that at RUNTIME
// (real Node), if the plugin isn't installed the require throws and is swallowed. But that
// require's target resolves to medusa-plugin-access's package root export, which is its
// `src/utils` barrel (see access/src/index.ts) -- the exact same barrel task 6-9's access
// onboarding found imports `@medusajs/framework/utils` (-> jsonwebtoken -> jws -> util.inherits),
// `fs/promises`, and `@medusajs/modules-sdk`. Vite's dependency pre-bundling resolves and
// evaluates that module graph while building the test bundle, before the try/catch's runtime
// semantics can matter -- confirmed empirically: importing middlewares.ts for real here crashes
// the whole suite with "TypeError: util.inherits is not a function" (deep in jws/jsonwebtoken),
// exactly like an unguarded route.ts import.
//
// The validators.ts file, by contrast, is completely safe: pure zod (aliased
// `@medusajs/framework/zod` -> `zod`) and `createFindParams` (aliased
// `@medusajs/medusa/api/utils/validators` -> the shim). So this file hand-mirrors
// middlewares.ts's route -> (validator, queryConfig) declarations using
// `validateAndTransformQuery`/`validateAndTransformBody` (imported from the aliased
// `@medusajs/framework/http`, so they still tag `__schema`/`__queryConfig` the same way
// `loadRouteContracts` expects) applied to the REAL, live schema objects -- without ever
// importing middlewares.ts, medusa-plugin-access, or multer. Routes with no zod schema (the
// multer file-upload POST, and the plain DELETE/GET handlers with no validator) are intentionally
// omitted below; file-system discovery via `routeModules` still makes them resolve as routes with
// no contract to validate against. Keep this list in sync with the real middlewares.ts by hand;
// there is no way to derive it from it safely.
const routes = [
	{
		matcher: '/admin/complaints',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaints, {
				defaults: [
					'id',
					'number',
					'status',
					'description',
					'created_at',
					'updated_at',
					'customer_id',
					'order_id',
					'product_id',
					'stock_lot_id',
					'serial_number_id',
					'actionable',
					'reportable',
					'tags.*'
				],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{ matcher: '/admin/complaints', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminCreateComplaint)] },
	{ matcher: '/admin/complaints', methods: ['DELETE'], middlewares: [validateAndTransformBody(V.AdminDeleteComplaints)] },
	{ matcher: '/admin/complaints/pdf-export', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminGenerateComplaintsPdfExport)] },
	{
		matcher: '/admin/complaints/:id',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaint, {
				defaults: [
					'id',
					'number',
					'status',
					'description',
					'created_at',
					'updated_at',
					'customer_id',
					'order_id',
					'product_id',
					'stock_lot_id',
					'serial_number_id',
					'actionable',
					'reportable',
					'tags.*',
					'customer.*',
					'order.*',
					'product.*',
					'metadata'
				],
				isList: false
			})
		]
	},
	{ matcher: '/admin/complaints/:id', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminUpdateComplaint)] },
	{ matcher: '/admin/complaints/:id/notes', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminCreateComplaintNote)] },
	{ matcher: '/admin/complaints/:id/notes/:note_id', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminUpdateComplaintNote)] },
	{
		matcher: '/admin/complaint-tags',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaintTags, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{ matcher: '/admin/complaint-tags', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminCreateComplaintTag)] },
	{ matcher: '/admin/complaint-tags', methods: ['DELETE'], middlewares: [validateAndTransformBody(V.AdminDeleteComplaintTags)] },
	{
		matcher: '/admin/complaint-tags/:id',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaintTag, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: false
			})
		]
	},
	{ matcher: '/admin/complaint-tags/:id', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminUpdateComplaintTag)] },
	{
		matcher: '/admin/complaints/:id/activities',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaintActivities, {
				defaults: ['id', 'complaint_id', 'user_id', 'type', 'note', 'metadata', 'created_at', 'updated_at', 'user.*'],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{ matcher: '/admin/complaints/:id/activities', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminCreateComplaintActivity)] },
	{ matcher: '/admin/complaints/:id/activities', methods: ['DELETE'], middlewares: [validateAndTransformBody(V.AdminDeleteComplaintActivities)] },
	{
		matcher: '/admin/complaints/:id/activities/:entry_id',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaintActivity, {
				defaults: ['id', 'complaint_id', 'user_id', 'type', 'note', 'metadata', 'created_at', 'updated_at', 'user.*'],
				isList: false
			})
		]
	},
	{ matcher: '/admin/complaints/:id/activities/:entry_id', methods: ['POST'], middlewares: [validateAndTransformBody(V.AdminUpdateComplaintActivity)] },
	{
		matcher: '/admin/complaint-stats/products/:product_id',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaintProductStat, {
				defaults: ['id', 'product_id', 'total_complaints', 'total_orders', 'complaint_rate', 'last_calculated_at'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/complaints/:id/documents',
		methods: ['GET'],
		middlewares: [
			validateAndTransformQuery(V.AdminGetComplaintDocuments, {
				defaults: ['id', 'complaint_id', 'filename', 'mime_type', 'size_bytes', 'uploaded_by', 'created_at'],
				isList: true,
				defaultLimit: 50
			})
		]
	}
	// POST /admin/complaints/:id/documents (multer upload, no zod schema) is intentionally
	// omitted -- routeModules file-system discovery covers its existence.
]

export const contracts = loadRouteContracts(routes, { routeModules })

export function makeComplaint(overrides: Partial<AdminComplaint> = {}): AdminComplaint {
	return {
		id: 'complaint_1',
		number: 1,
		status: 'open',
		description: 'The widget arrived damaged.',
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
		customer_id: 'cus_1',
		order_id: null,
		product_id: null,
		stock_lot_id: null,
		serial_number_id: null,
		actionable: false,
		reportable: false,
		metadata: null,
		tags: [],
		...overrides
	}
}

export function makeComplaintTag(overrides: Partial<AdminComplaintTag> = {}): AdminComplaintTag {
	return {
		id: 'ctag_1',
		value: 'VIP',
		created_at: '2026-01-15T10:00:00.000Z',
		updated_at: '2026-01-15T10:00:00.000Z',
		...overrides
	}
}

export function makeComplaintActivity(overrides: Partial<AdminComplaintActivity> = {}): AdminComplaintActivity {
	return {
		id: 'cact_1',
		complaint_id: 'complaint_1',
		user_id: 'user_1',
		type: 'note',
		note: 'Followed up with the customer by phone.',
		metadata: null,
		created_at: '2026-01-15T11:00:00.000Z',
		updated_at: '2026-01-15T11:00:00.000Z',
		user: { id: 'user_1', first_name: 'Jane', last_name: 'Doe', email: 'jane@example.com' } as unknown as AdminComplaintActivity['user'],
		...overrides
	}
}

/**
 * The fake the mocked SDK is currently pointed at. The mocked module's `fetch` reads this at
 * CALL time rather than closing over one fake, because `vi.resetModules()` does not evict an
 * already-evaluated module graph in browser mode: a second `mount()` in the same file re-runs
 * `vi.doMock`, but the component keeps the sdk module it already imported. Closing over the fake
 * meant the second test's component talked to the FIRST test's fake — it rendered fine while the
 * new fake recorded zero calls, so any assertion on `fake.calls` silently examined the wrong
 * object. Indirection makes stale module identity harmless.
 */
let currentFake: ContractFake | undefined

/**
 * Installs a contract-checked fake over the plugin's admin SDK. Every request the
 * components make is validated against the plugin's own validators before a responder runs.
 */
export function installFake(responders: Record<string, Responder>) {
	const fake = createContractFake({ contracts, responders })
	currentFake = fake
	vi.doMock('../lib/sdk', () => ({
		sdk: {
			client: {
				fetch: (path: string, options?: Parameters<ContractFake['fetch']>[1]) => {
					if (!currentFake) throw new Error('[complaints tests] no fake installed for this test')
					return currentFake.fetch(path, options)
				}
			}
		}
	}))
	return fake
}
