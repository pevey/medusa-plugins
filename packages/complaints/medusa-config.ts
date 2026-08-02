import { loadEnv, defineConfig } from '@medusajs/framework/utils'
import { TEST_UPLOAD_DIR } from './integration-tests/http/upload-dir'

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
	// medusa-plugin-access is an OPTIONAL peer of this plugin, and without it installed, guardResource/sealNamespace/definePolicies would never execute in a test
	plugins: [
		{
			resolve: 'medusa-plugin-access',
			options: {}
		}
	],
	modules: [
		{
			resolve: './src/modules/complaint'
		},
		{
			// Not published (package.json `files` only ships `.medusa/server`), so this
			// only ever runs for local dev and the integration-test runner. Pins the
			// local file provider's upload dirs to a throwaway OS temp directory --
			// see integration-tests/http/upload-dir.ts for why.
			resolve: '@medusajs/medusa/file',
			options: {
				providers: [
					{
						resolve: '@medusajs/file-local',
						id: 'local',
						options: {
							upload_dir: TEST_UPLOAD_DIR,
							private_upload_dir: TEST_UPLOAD_DIR
						}
					}
				]
			}
		}
	]
})
