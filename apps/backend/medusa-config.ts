import {
	loadEnv,
	defineConfig,
	Modules,
	ContainerRegistrationKeys
} from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
	projectConfig: {
		databaseUrl: process.env.DATABASE_URL,
		redisUrl: process.env.REDIS_URL,
		http: {
			storeCors: process.env.STORE_CORS || 'http://localhost:5173',
			adminCors: process.env.ADMIN_CORS || 'http://localhost:5173',
			authCors: process.env.AUTH_CORS || 'http://localhost:5173',
			jwtSecret: process.env.JWT_SECRET || 'supersecret',
			cookieSecret: process.env.COOKIE_SECRET || 'supersecret',
			restrictedFields: {
				store: [
					'complaint',
					'complaints',
					'customer_tag',
					'customer_tags',
					'order_note',
					'order_notes',
					'inventory_quantity'
				]
			}
		},
		sessionOptions: {
			ttl: 1000 * 60 * 60 * 24 * 30 // 30 days in milliseconds
		},
		workerMode: (process.env.WORKER_MODE || 'shared') as 'shared' | 'worker' | 'server'
	},
	featureFlags: {
		caching: true, //https://docs.medusajs.com/resources/infrastructure-modules/caching#install-the-caching-module
		index_engine: true //https://docs.medusajs.com/learn/fundamentals/module-links/index-module#content
		// rbac: true,
		// rbac_filter_fields: true,
		// translation: true,
	},
	admin: {
		disable: process.env.ADMIN_DISABLED === 'true' || false,
		path: (process.env.ADMIN_PATH || '/dashboard') as `/${string}`,
		storefrontUrl: process.env.MEDUSA_STOREFRONT_URL || 'http://localhost:5173',
		backendUrl: process.env.MEDUSA_BACKEND_URL || 'http://localhost:9000',
		vite: () => ({
			plugins: [
				{
					name: 'inject-favicon',
					transformIndexHtml: (html: string) =>
						html.replace(
							/<link rel="icon" href="data:," data-placeholder-favicon \/>/,
							'<link rel="icon" type="image/svg+xml" href="/static/favicon.svg" />'
						)
				}
			]
		})
	},
	modules: [
		{
			resolve: '@medusajs/medusa/analytics',
			options: {
				providers: [
					{
						resolve: 'mildred/providers/analytics-mildred',
						id: 'mildred'
					}
				]
			}
		},
		{
			resolve: '@medusajs/medusa/auth',
			dependencies: [Modules.CACHE, ContainerRegistrationKeys.LOGGER],
			options: {
				providers: [
					// other providers...
					{
						resolve: '@medusajs/medusa/auth-emailpass',
						id: 'emailpass',
						options: {
							// options...
						}
					}
				]
			}
		},
		{
			resolve: '@medusajs/medusa/caching',
			options: {
				providers: [
					{
						resolve: '@medusajs/caching-redis',
						id: 'caching-redis',
						// Optional, makes this the default caching provider
						is_default: true,
						options: {
							redisUrl: process.env.CACHE_REDIS_URL
							// more options...
						}
					}
					// other caching providers...
				]
			}
		},
		{
			resolve: '@medusajs/medusa/event-bus-redis',
			options: {
				redisUrl: process.env.EVENTS_REDIS_URL,
				jobOptions: {
					removeOnComplete: {
						// keep jobs for 1 hour or up to 1000 jobs
						age: 3600,
						count: 1000
					},
					removeOnFail: {
						// keep jobs for 1 hour or up to 1000 jobs
						age: 3600,
						count: 1000
					}
				}
			}
		},
		{
			resolve: '@medusajs/medusa/file',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-r2',
						id: 'r2',
						options: {
							region: process.env.R2_REGION,
							bucket: process.env.R2_BUCKET,
							accessKeyId: process.env.R2_ACCESS_KEY_ID,
							secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
							fileUrl: process.env.R2_FILE_URL,
							endpoint: process.env.R2_ENDPOINT,
							privateRegion: process.env.R2_PRIVATE_REGION,
							privateBucket: process.env.R2_PRIVATE_BUCKET,
							privateAccessKeyId: process.env.R2_PRIVATE_ACCESS_KEY_ID,
							privateSecretAccessKey: process.env.R2_PRIVATE_SECRET_ACCESS_KEY,
							privateEndpoint: process.env.R2_PRIVATE_ENDPOINT
						}
					}
				]
			}
		},
		{
			resolve: '@medusajs/medusa/fulfillment',
			options: {
				providers: [
					{
						resolve: '@medusajs/medusa/fulfillment-manual',
						id: 'manual'
					}
				]
			}
		},
		{
			resolve: '@medusajs/index'
		},
		{
			resolve: '@medusajs/medusa/locking',
			options: {
				providers: [
					{
						resolve: '@medusajs/medusa/locking-redis',
						id: 'locking-redis',
						// set this if you want this provider to be used by default
						// and you have other Locking Module Providers registered.
						is_default: true,
						options: {
							redisUrl: process.env.LOCKING_REDIS_URL
						}
					}
				]
			}
		},
		{
			resolve: '@medusajs/medusa/notification',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-ses',
						id: 'ses',
						options: {
							channels: ['email'],
							sesClientConfig: {
								region: process.env.SES_REGION,
								credentials: {
									accessKeyId: process.env.SES_ACCESS_KEY_ID,
									secretAccessKey: process.env.SES_SECRET_ACCESS_KEY
								}
							},
							from: process.env.SES_FROM
						}
					},
					{
						resolve: '@medusajs/medusa/notification-local',
						id: 'local',
						options: {
							name: 'Local Notification Provider',
							channels: ['feed']
						}
					}
				]
			}
		},
		{
			resolve: '@medusajs/medusa/payment',
			dependencies: [Modules.CACHING],
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-braintree',
						id: 'braintree',
						options: {
							environment:
								process.env.BRAINTREE_ENVIRONMENT ||
								(process.env.NODE_ENV !== 'production' ? 'sandbox' : 'production'),
							defaultCurrencyCode: 'USD',
							merchantId: process.env.BRAINTREE_MERCHANT_ID,
							publicKey: process.env.BRAINTREE_PUBLIC_KEY,
							privateKey: process.env.BRAINTREE_PRIVATE_KEY,
							webhookSecret: process.env.BRAINTREE_WEBHOOK_SECRET,
							enable3DSecure: process.env.BRAINTREE_ENABLE_3D_SECURE === 'true',
							savePaymentMethod: true, // Save payment methods for future use
							autoCapture: true // Automatically capture payments
						}
					}
				]
			}
		},
		{
			resolve: '@medusajs/medusa/tax',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-tax-lookup',
						id: 'tax-lookup',
						options: {
							dataDirectory: './tax-data' // Directory where tax data files are stored
						}
					}
				]
			}
		},
		{
			resolve: '@medusajs/medusa/workflow-engine-redis',
			options: {
				redis: {
					redisUrl: process.env.WE_REDIS_URL
				}
			}
		}
	],
	plugins: [
		{
			resolve: 'majel',
			options: {
				webhooks: {
					maxPayloadSize: process.env.WEBHOOK_MAX_PAYLOAD_SIZE || '100kb',
					maxWorkflowIterations: process.env.WEBHOOK_MAX_WORKFLOW_ITERATIONS
						? +process.env.WEBHOOK_MAX_WORKFLOW_ITERATIONS
						: 50
				}
			}
		},
		{
			resolve: 'mildred',
			options: {}
		},
		{
			resolve: 'medusa-plugin-barcodes',
			options: {}
		},
		{
			resolve: 'medusa-plugin-complaints',
			options: {}
		},
		{
			resolve: 'medusa-plugin-content',
			options: {}
		},
		{
			resolve: 'medusa-plugin-customer-tags',
			options: {}
		},
		{
			resolve: 'medusa-plugin-forms',
			options: {
				turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '',
				turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || ''
			}
		},
		{
			resolve: 'medusa-plugin-ratings',
			options: {
				defaultStatus: process.env.REVIEW_DEFAULT_STATUS || 'pending'
			}
		},
		{
			resolve: 'medusa-plugin-tracing',
			options: {}
		},
		{
			resolve: 'medusa-plugin-veeqo',
			options: {
				apiKey: process.env.VEEQO_API_KEY || '',
				timeout: process.env.VEEQO_TIMEOUT ? +process.env.VEEQO_TIMEOUT : 5000,
				retry: process.env.VEEQO_RETRY ? +process.env.VEEQO_RETRY : 3,
				...(process.env.VEEQO_URL ? { veeqoUrl: process.env.VEEQO_URL } : {})
			}
		}
	]
})
