import {
	defineMiddlewares,
	validateAndTransformBody,
	validateAndTransformQuery
} from '@medusajs/framework/http'
import {
	AdminGetRubrics,
	AdminGetRubric,
	AdminCreateRubric,
	AdminUpdateRubric,
	AdminDeleteRubrics,
	AdminGetEvents,
	AdminGetEventCounts,
	AdminGetFunnelQuery,
	AdminGetFunnels,
	AdminGetFunnel,
	AdminCreateFunnel,
	AdminUpdateFunnel,
	AdminDeleteFunnels,
	AdminGetSegments,
	AdminCreateSegment,
	AdminDeleteSegments,
	AdminGetSegment,
	AdminUpdateSegment,
	AdminGetSegmentMembers,
	StoreTrackEvent
} from './validators'

export default defineMiddlewares({
	routes: [
		{
			matcher: '/admin/analytics/rubrics',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetRubrics, {
					defaults: [
						'id',
						'name',
						'label',
						'description',
						'active',
						'created_at',
						'updated_at'
					],
					isList: true,
					defaultLimit: 50
				})
			]
		},
		{
			matcher: '/admin/analytics/rubrics',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminCreateRubric)]
		},
		{
			matcher: '/admin/analytics/rubrics',
			method: ['DELETE'],
			middlewares: [validateAndTransformBody(AdminDeleteRubrics)]
		},
		{
			matcher: '/admin/analytics/rubrics/:id',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetRubric, {
					defaults: [
						'id',
						'name',
						'label',
						'description',
						'expected_properties',
						'active',
						'created_at',
						'updated_at'
					],
					isList: false
				})
			]
		},
		{
			matcher: '/admin/analytics/rubrics/:id',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminUpdateRubric)]
		},
		// ── Admin Events ─────────────────────────────────────────────────────────
		{
			matcher: '/admin/analytics/events',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetEvents, {
					defaults: [
						'id',
						'event',
						'actor_id',
						'source',
						'sales_channel_id',
						'properties',
						'timestamp',
						'created_at'
					],
					isList: true,
					defaultLimit: 50
				})
			]
		},
		{
			matcher: '/admin/analytics/events/counts',
			method: ['GET'],
			middlewares: [validateAndTransformQuery(AdminGetEventCounts, {})]
		},
		// ── Admin Funnel Query ───────────────────────────────────────────────────
		{
			matcher: '/admin/analytics/funnel',
			method: ['GET'],
			middlewares: [validateAndTransformQuery(AdminGetFunnelQuery, {})]
		},
		// ── Admin Funnels ────────────────────────────────────────────────────────
		{
			matcher: '/admin/analytics/funnels',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetFunnels, {
					defaults: [
						'id',
						'name',
						'label',
						'description',
						'steps',
						'sales_channel_id',
						'is_default',
						'created_at',
						'updated_at'
					],
					isList: true,
					defaultLimit: 50
				})
			]
		},
		{
			matcher: '/admin/analytics/funnels',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminCreateFunnel)]
		},
		{
			matcher: '/admin/analytics/funnels',
			method: ['DELETE'],
			middlewares: [validateAndTransformBody(AdminDeleteFunnels)]
		},
		{
			matcher: '/admin/analytics/funnels/:id',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetFunnel, {
					defaults: [
						'id',
						'name',
						'label',
						'description',
						'steps',
						'sales_channel_id',
						'is_default',
						'created_at',
						'updated_at'
					],
					isList: false
				})
			]
		},
		{
			matcher: '/admin/analytics/funnels/:id',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminUpdateFunnel)]
		},
		// ── Admin Segments ──────────────────────────────────────────────────────
		{
			matcher: '/admin/analytics/segments',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetSegments, {
					defaults: [
						'id',
						'name',
						'label',
						'description',
						'rules',
						'sales_channel_id',
						'created_by',
						'created_at',
						'updated_at'
					],
					isList: true,
					defaultLimit: 50
				})
			]
		},
		{
			matcher: '/admin/analytics/segments',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminCreateSegment)]
		},
		{
			matcher: '/admin/analytics/segments',
			method: ['DELETE'],
			middlewares: [validateAndTransformBody(AdminDeleteSegments)]
		},
		{
			matcher: '/admin/analytics/segments/:id',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetSegment, {
					defaults: [
						'id',
						'name',
						'label',
						'description',
						'rules',
						'sales_channel_id',
						'created_by',
						'created_at',
						'updated_at'
					],
					isList: false
				})
			]
		},
		{
			matcher: '/admin/analytics/segments/:id',
			method: ['POST'],
			middlewares: [validateAndTransformBody(AdminUpdateSegment)]
		},
		{
			matcher: '/admin/analytics/segments/:id/members',
			method: ['GET'],
			middlewares: [
				validateAndTransformQuery(AdminGetSegmentMembers, {
					defaults: ['id', 'segment_id', 'actor_id', 'evaluated_at'],
					isList: true,
					defaultLimit: 50
				})
			]
		},
		{
			matcher: '/admin/analytics/segments/:id/preview',
			method: ['GET'],
			middlewares: []
		},
		{
			matcher: '/admin/analytics/segments/:id/export',
			method: ['GET'],
			middlewares: []
		},
		// ── Store Ping ───────────────────────────────────────────────────────────
		{
			matcher: '/store/ping',
			method: ['POST'],
			middlewares: [validateAndTransformBody(StoreTrackEvent)]
		}
	]
})
