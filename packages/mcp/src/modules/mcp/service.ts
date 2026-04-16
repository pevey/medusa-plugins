import { MedusaService } from '@medusajs/framework/utils'
import type { McpPluginOptions } from '../../types'

export class McpService extends MedusaService({}) {
	protected readonly options_: McpPluginOptions

	constructor(_container: object, options: McpPluginOptions) {
		super(...arguments)
		this.options_ = options
	}

	getOptions(): McpPluginOptions {
		return this.options_
	}
}
