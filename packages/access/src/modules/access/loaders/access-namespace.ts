import { LoaderOptions } from '@medusajs/framework/types'
import { configureAccessNamespace } from '../../../utils/access-namespace'
import { AccessModuleOptions } from '../types'

/**
 * Routes the plugin's `accessNamespace` option into the namespace registry, so
 * users configure `/access` actor types and CORS where they already configure
 * the plugin. Plugins registering custom actor types call
 * `configureAccessNamespace` directly instead.
 */
export default async function accessNamespaceLoader({ options }: LoaderOptions<AccessModuleOptions>): Promise<void> {
	if (options?.accessNamespace) {
		configureAccessNamespace(options.accessNamespace)
	}
}
