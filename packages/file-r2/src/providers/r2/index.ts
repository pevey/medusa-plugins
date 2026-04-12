import { ModuleProvider, Modules } from '@medusajs/framework/utils'
import { R2FileProvider } from './provider'

export default ModuleProvider(Modules.FILE, {
	services: [R2FileProvider]
})
