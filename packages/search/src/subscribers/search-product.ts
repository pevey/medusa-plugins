import { SubscriberArgs, type SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import upsertSearchDocumentWorkflow from '../workflows/upsert-search-document'
import deleteSearchDocumentWorkflow from '../workflows/delete-search-document'

export default async function searchProductHandler({
	event: { name: eventName, data },
	container
}: SubscriberArgs<{ id: string }>) {
	const logger = container.resolve('logger')
	const query = container.resolve(ContainerRegistrationKeys.QUERY)

	try {
		// Direct product events
		if (eventName.startsWith('product.')) {
			if (eventName === 'product.deleted') {
				await deleteSearchDocumentWorkflow(container).run({ input: { type: 'product', id: data.id } })
			} else {
				await upsertSearchDocumentWorkflow(container).run({ input: { type: 'product', id: data.id } })
			}
			return
		}

		// Variant / option events: resolve the parent product, then reindex it
		let productId: string | undefined
		if (eventName.startsWith('product-variant.')) {
			const { data: rows } = await query.graph({
				entity: 'product_variant',
				fields: ['product_id'],
				filters: { id: data.id }
			})
			productId = rows[0]?.product_id
		} else if (eventName.startsWith('product-option.')) {
			const { data: rows } = await query.graph({
				entity: 'product_option',
				fields: ['product_id'],
				filters: { id: data.id }
			})
			productId = rows[0]?.product_id
		}

		if (!productId) {
			logger.warn(`[search] ${eventName}: could not resolve product for id ${data.id}; nightly reindex will reconcile`)
			return
		}
		await upsertSearchDocumentWorkflow(container).run({ input: { type: 'product', id: productId } })
	} catch (error) {
		logger.error(`[search] ${eventName} failed for ${data.id}: ${(error as Error).message}`)
	}
}

export const config: SubscriberConfig = {
	event: [
		'product.created',
		'product.updated',
		'product.deleted',
		'product-variant.created',
		'product-variant.updated',
		'product-option.created',
		'product-option.updated'
	]
}
