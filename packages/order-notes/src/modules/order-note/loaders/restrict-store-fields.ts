import { LoaderOptions } from '@medusajs/framework/types'
import { OrderNoteModuleOptions } from '../types'

/**
 * Declares the order-note relations as restricted on `/store`, unless the
 * module is configured with `adminOnly: false`.
 *
 * The access plugin is an optional peer: imported lazily so this module works
 * without it. When it is absent, the default stays a silent no-op — but an
 * operator who wrote `adminOnly: true` explicitly asked for protection that
 * cannot be provided, and that must not pass silently.
 */
export default async function restrictStoreFields({ options, logger }: LoaderOptions<OrderNoteModuleOptions>): Promise<void> {
	if (options?.adminOnly === false) {
		return
	}

	try {
		const { declareRestrictedFields } = await import('medusa-plugin-access/field-restrictions')
		declareRestrictedFields({ prefix: '/store', fields: ['order_note', 'order_notes'] })
	} catch (error) {
		if (options?.adminOnly === true) {
			logger?.warn(
				`order-notes: adminOnly is set, but medusa-plugin-access could not be loaded — order notes are hidden only by Medusa's own field lists, which cover core store routes but not POST /store/search or store routes without an allowed-fields list. Install medusa-plugin-access for full coverage. (${error instanceof Error ? error.message : String(error)})`
			)
		}
	}
}
