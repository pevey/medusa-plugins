import { ConfigModule } from '@medusajs/framework'

export function getMedusaBackendUrl(config: ConfigModule) {
	return config.admin.backendUrl !== '/' ? config.admin.backendUrl : 'http://localhost:9000'
}

export function getMedusaAdminUrl(config: ConfigModule) {
	const backendUrl = getMedusaBackendUrl(config)
	const adminPath = config.admin.path ? `${config.admin.path}` : '/app'
	return `${backendUrl}${adminPath}`
}

export function getMedusaStorefrontUrl(config: ConfigModule) {
	return config.admin.storefrontUrl || 'http://localhost:8000'
}
