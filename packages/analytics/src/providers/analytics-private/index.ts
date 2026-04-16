import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { PrivateAnalyticsProvider } from './provider'

export default ModuleProvider(Modules.ANALYTICS, {
	services: [PrivateAnalyticsProvider]
})
