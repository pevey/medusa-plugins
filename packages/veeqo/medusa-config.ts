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
			jwtSecret: process.env.JWT_SECRET || 'supersecret',
			cookieSecret: process.env.COOKIE_SECRET || 'supersecret'
		}
	},
	modules: [
		{
			resolve: './src/modules/veeqo',
			options: {
				apiKey: process.env.VEEQO_API_KEY || '',
				timeout: process.env.VEEQO_TIMEOUT ? +process.env.VEEQO_TIMEOUT : 5000,
				retry: process.env.VEEQO_RETRY ? +process.env.VEEQO_RETRY : 3,
				...(process.env.VEEQO_URL ? { veeqoUrl: process.env.VEEQO_URL } : {})
			}
		}
	]
})
