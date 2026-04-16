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
			resolve: './src/modules/form',
			options: {
				turnstileSiteKey: process.env.TURNSTILE_SITE_KEY || '1x00000000000000000000AA',
				turnstileSecretKey: process.env.TURNSTILE_SECRET_KEY || '1x0000000000000000000000000000000AA'
			}
		}
	]
})
