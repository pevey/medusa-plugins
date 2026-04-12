import { updateCustomersWorkflow } from '@medusajs/medusa/core-flows'
import { StepResponse } from '@medusajs/framework/workflows-sdk'
import { Modules } from '@medusajs/framework/utils'
import { LinkDefinition } from '@medusajs/framework/types'
import { CUSTOMER_TAG_MODULE } from '../../modules/customer-tag'
import { CustomerTagService } from '../../modules/customer-tag/service'

updateCustomersWorkflow.hooks.customersUpdated(
	async ({ customers, additional_data }, { container }) => {
		console.log('Customer Update Hook Triggered', additional_data)
		const tagIds = additional_data?.customer_tag_ids as string[] | undefined
		if (!tagIds?.length) {
			return new StepResponse([], [])
		}
		const customerTagService: CustomerTagService = container.resolve(CUSTOMER_TAG_MODULE)

		// if any tag doesn't exist, an error is thrown.
		for (const tagId of tagIds) {
			await customerTagService.retrieveCustomerTag(tagId)
		}

		const link = container.resolve('link')
		const logger = container.resolve('logger')

		const links: LinkDefinition[] = []

		for (const customer of customers) {
			for (const tagId of tagIds) {
				links.push({
					[Modules.CUSTOMER]: {
						customer_id: customer.id
					},
					[CUSTOMER_TAG_MODULE]: {
						customer_tag_id: tagId
					}
				})
			}
		}

		await link.create(links)

		logger.info('Linked customer to tags')

		return new StepResponse(links, links)
	},
	async (links, { container }) => {
		if (!links?.length) {
			return
		}
		const link = container.resolve('link')
		await link.dismiss(links)
	}
)
