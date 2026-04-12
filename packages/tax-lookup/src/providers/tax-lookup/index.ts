import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { TaxLookupProvider } from './provider'

export default ModuleProvider(Modules.TAX, {
	services: [TaxLookupProvider]
})
