import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { BraintreeProvider } from './provider'

export default ModuleProvider(Modules.PAYMENT, {
	services: [BraintreeProvider]
})
