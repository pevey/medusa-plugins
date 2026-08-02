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
	// The permission cache is only exercisable when the caching module is loaded
	// AND the `caching` flag is on — `useCache` no-ops otherwise. The in-memory
	// provider needs no external service, so enabling it here makes cache
	// invalidation testable without infrastructure.
	featureFlags: {
		caching: true
	},
	modules: [
		{
			resolve: './src/modules/access'
		},
		{
			resolve: '@medusajs/medusa/caching',
			options: {
				in_memory: { enable: true }
			}
		}
	]
})
