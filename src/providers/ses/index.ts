import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { SesNotificationProvider } from './provider'

export default ModuleProvider(Modules.NOTIFICATION, {
	services: [SesNotificationProvider]
})
