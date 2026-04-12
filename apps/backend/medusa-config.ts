import { loadEnv, defineConfig, Modules } from '@medusajs/framework/utils'

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
			cookieSecret: process.env.COOKIE_SECRET || 'supersecret'
		}
	},
	modules: [
		{
			resolve: '@medusajs/medusa/analytics',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-mildred/providers/analytics-mildred',
						id: 'mildred'
					}
				]
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
		}
	],
	plugins: [
		{
			resolve: 'medusa-plugin-customer-tags',
			options: {}
		},
		{
			resolve: 'medusa-plugin-mildred',
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
