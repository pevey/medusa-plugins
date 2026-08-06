import { LoaderOptions } from '@medusajs/framework/types'
import { CustomerTagModuleOptions } from '../types'

/**
 * Declares the customer-tag relations as restricted on `/store`, unless the
 * module is configured with `adminOnly: false`.
 *
 * The access plugin is an optional peer: imported lazily so this module works
 * without it. When it is absent, the default stays a silent no-op — but an
 * operator who wrote `adminOnly: true` explicitly asked for protection that
 * cannot be provided, and that must not pass silently.
 */
export default async function restrictStoreFields({ options, logger }: LoaderOptions<CustomerTagModuleOptions>): Promise<void> {
	if (options?.adminOnly === false) {
		return
	}

	try {
		const { declareRestrictedFields } = await import('medusa-plugin-access/field-restrictions')
		declareRestrictedFields({ prefix: '/store', fields: ['customer_tag', 'customer_tags'] })
	} catch (error) {
		if (options?.adminOnly === true) {
			logger?.warn(
				`customer-tags: adminOnly is set, but medusa-plugin-access could not be loaded — customer tags are NOT hidden from store responses. Install medusa-plugin-access, or configure http.restrictedFields and enable MEDUSA_FF_RBAC_FILTER_FIELDS. (${error instanceof Error ? error.message : String(error)})`
			)
		}
	}
}
