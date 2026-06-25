import { loadEnv, defineConfig } from '@medusajs/framework/utils'

loadEnv(process.env.NODE_ENV || 'development', process.cwd())

module.exports = defineConfig({
	projectConfig: {
		redisUrl: process.env.REDIS_URL,
		databaseUrl: process.env.DATABASE_URL,
		http: {
			storeCors: process.env.STORE_CORS || 'http://localhost:5173',
			adminCors: process.env.ADMIN_CORS || 'http://localhost:5173,http://localhost:9000',
			authCors: process.env.AUTH_CORS || 'http://localhost:5173,http://localhost:9000',
			jwtSecret: process.env.JWT_SECRET,
			cookieSecret: process.env.COOKIE_SECRET
		}
	},
	modules: [
		{
			resolve: './src/modules/automation',
			options: {
				secret: process.env.AUTOMATION_SECRET || 'integration-test-only-secret-not-for-prod',
				ssrf: {
					// Integration tests target a localhost mock server.
					allowedSchemes: ['http', 'https'],
					allowPrivateIps: true
				}
			}
		}
	]
})
