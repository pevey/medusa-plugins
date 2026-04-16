import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { MildredAnalyticsProvider } from './provider'

export default ModuleProvider(Modules.ANALYTICS, {
	services: [MildredAnalyticsProvider]
})
