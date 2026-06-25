import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import {
	AdminCreateAutomationAction,
	AdminCreateAutomationSecret,
	AdminCreateAutomationTrigger,
	AdminDeleteAutomationActions,
	AdminDeleteAutomationTriggers,
	AdminGetAutomationAction,
	AdminGetAutomationActions,
	AdminGetAutomationDeliveries,
	AdminGetAutomationReceipts,
	AdminGetAutomationSecrets,
	AdminGetAutomationTrigger,
	AdminGetAutomationTriggers,
	AdminRetryAutomationDeliveries,
	AdminUpdateAutomationAction,
	AdminUpdateAutomationTrigger,
	AdminUpsertAutomationQuery
} from './validators'

export default defineMiddlewares([
	// Triggers
	{
		matcher: '/admin/automations',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetAutomationTriggers, {
				defaults: [
					'id', 'name', 'description', 'trigger_type', 'is_active',
					'trigger_events', 'signature_config', 'log_incoming',
					'metadata', 'created_at', 'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/automations',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateAutomationTrigger)]
	},
	{
		matcher: '/admin/automations',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteAutomationTriggers)]
	},
	{
		matcher: '/admin/automations/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetAutomationTrigger, {
				defaults: [
					'id', 'name', 'description', 'trigger_type', 'is_active',
					'trigger_events', 'signature_config', 'log_incoming',
					'metadata', 'created_at', 'updated_at'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/automations/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateAutomationTrigger)]
	},
	// Actions
	{
		matcher: '/admin/automations/:id/actions',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetAutomationActions, {
				defaults: [
					'id', 'name', 'description', 'action_type', 'is_active', 'target_url',
					'signing_secret_id', 'target_headers', 'medusa_workflow', 'field_mappings',
					'metadata', 'created_at', 'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/automations/:id/actions',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateAutomationAction)]
	},
	{
		matcher: '/admin/automations/:id/actions',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteAutomationActions)]
	},
	{
		matcher: '/admin/automations/:id/actions/:actionId',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetAutomationAction, {
				defaults: [
					'id', 'name', 'description', 'action_type', 'is_active', 'target_url',
					'signing_secret_id', 'target_headers', 'medusa_workflow', 'field_mappings',
					'metadata', 'created_at', 'updated_at'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/automations/:id/actions/:actionId',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateAutomationAction)]
	},
	{
		matcher: '/admin/automations/:id/actions/:actionId/query',
		method: ['GET'],
		middlewares: []
	},
	{
		matcher: '/admin/automations/:id/actions/:actionId/query',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpsertAutomationQuery)]
	},
	{
		matcher: '/admin/automations/:id/actions/:actionId/query',
		method: ['DELETE'],
		middlewares: []
	},
	{
		matcher: '/admin/automations/:id/actions/:actionId/deliveries',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetAutomationDeliveries, {
				defaults: [
					'id', 'event_name', 'status', 'attempts', 'response_status',
					'response_body', 'request_payload', 'error_message', 'created_at', 'updated_at'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/automations/:id/actions/:actionId/deliveries/retry',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminRetryAutomationDeliveries)]
	},
	{
		matcher: '/admin/automations/:id/receipts',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetAutomationReceipts, {
				defaults: ['id', 'request_ip', 'payload', 'created_at'],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	// Secrets
	{
		matcher: '/admin/automations/secrets',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetAutomationSecrets, {
				defaults: ['id', 'label', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 100
			})
		]
	},
	{
		matcher: '/admin/automations/secrets',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateAutomationSecret)]
	},
	{
		matcher: '/admin/automations/secrets/:id',
		method: ['DELETE'],
		middlewares: []
	},
	// Public listener
	// preserveRawBody is required so the webhook handler can verify HMAC
	// against the original bytes — re-stringifying req.body would change
	// key ordering / whitespace and silently break signature verification.
	//
	// sizeLimit is the HARD ceiling: requests above this never even reach
	// the route handler (bodyParser returns 413). Driven by MAX_WEBHOOK_PAYLOAD_SIZE
	// env var so prod can override without a code change. Default 512kb —
	// large enough for typical integration-target payloads (Shopify orders
	// with many line items, CRM/helpdesk events, newsletter exports) while
	// still bounding OOM risk on the public endpoint.
	{
		matcher: '/webhooks/:id',
		method: ['POST'],
		bodyParser: {
			sizeLimit: process.env.MAX_WEBHOOK_PAYLOAD_SIZE || '512kb',
			preserveRawBody: true
		},
		middlewares: []
	}
])
