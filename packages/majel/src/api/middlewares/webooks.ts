import { validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import type { MiddlewareRoute } from './_types'
import {
	AdminCreateWebhookAction,
	AdminCreateWebhookSecret,
	AdminCreateWebhookTrigger,
	AdminDeleteWebhookActions,
	AdminDeleteWebhookTriggers,
	AdminGetWebhookAction,
	AdminGetWebhookActions,
	AdminGetWebhookDeliveries,
	AdminGetWebhookReceipts,
	AdminGetWebhookSecrets,
	AdminGetWebhookTrigger,
	AdminGetWebhookTriggers,
	AdminUpdateWebhookAction,
	AdminUpdateWebhookTrigger,
	AdminUpsertWebhookQuery
} from '../validators'

export const webhookRoutes: MiddlewareRoute[] = [
	// Triggers
	{
		matcher: '/admin/webhook-triggers',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetWebhookTriggers, {
				defaults: [
					'id',
					'name',
					'description',
					'trigger_type',
					'is_active',
					'trigger_events',
					'metadata',
					'created_at',
					'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/webhook-triggers',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateWebhookTrigger)]
	},
	{
		matcher: '/admin/webhook-triggers',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteWebhookTriggers)]
	},
	{
		matcher: '/admin/webhook-triggers/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetWebhookTrigger, {
				defaults: [
					'id',
					'name',
					'description',
					'trigger_type',
					'is_active',
					'trigger_events',
					'metadata',
					'created_at',
					'updated_at'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/webhook-triggers/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateWebhookTrigger)]
	},
	// Actions
	{
		matcher: '/admin/webhook-triggers/:id/actions',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetWebhookActions, {
				defaults: [
					'id',
					'name',
					'description',
					'action_type',
					'is_active',
					'target_url',
					'signing_secret_id',
					'target_headers',
					'medusa_workflow',
					'field_mappings',
					'metadata',
					'created_at',
					'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateWebhookAction)]
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteWebhookActions)]
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions/:actionId',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetWebhookAction, {
				defaults: [
					'id',
					'name',
					'description',
					'action_type',
					'is_active',
					'target_url',
					'signing_secret_id',
					'target_headers',
					'medusa_workflow',
					'field_mappings',
					'metadata',
					'created_at',
					'updated_at'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions/:actionId',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateWebhookAction)]
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions/:actionId/query',
		method: ['GET'],
		middlewares: []
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions/:actionId/query',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpsertWebhookQuery)]
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions/:actionId/query',
		method: ['DELETE'],
		middlewares: []
	},
	{
		matcher: '/admin/webhook-triggers/:id/actions/:actionId/deliveries',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetWebhookDeliveries, {
				defaults: [
					'id',
					'event_name',
					'status',
					'attempts',
					'response_status',
					'response_body',
					'request_payload',
					'error_message',
					'created_at',
					'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/webhook-triggers/:id/receipts',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetWebhookReceipts, {
				defaults: ['id', 'request_ip', 'payload', 'created_at'],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	// Secrets
	{
		matcher: '/admin/webhook-secrets',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetWebhookSecrets, {
				defaults: ['id', 'label', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 100
			})
		]
	},
	{
		matcher: '/admin/webhook-secrets',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateWebhookSecret)]
	},
	{
		matcher: '/admin/webhook-secrets/:id',
		method: ['DELETE'],
		middlewares: []
	},
	// Public listener
	{
		matcher: '/webhooks/:id',
		method: ['POST'],
		bodyParser: { sizeLimit: '5mb' },
		middlewares: []
	}
]
