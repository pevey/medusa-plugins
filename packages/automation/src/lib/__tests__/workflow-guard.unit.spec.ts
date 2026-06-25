import { isBlockedWorkflowName } from '../workflow-guard'

describe('isBlockedWorkflowName', () => {
	it('blocks every core-flows delete*Workflow name', () => {
		const blocked = [
			'deleteCustomersWorkflow',
			'deleteCustomerAddressesWorkflow',
			'deleteCustomerGroupsWorkflow',
			'deleteProductsWorkflow',
			'deleteProductVariantsWorkflow',
			'deleteUsersWorkflow',
			'deleteRegionsWorkflow',
			'deletePromotionsWorkflow',
			'deleteSalesChannelsWorkflow',
			'deletePriceListsWorkflow',
			'deleteStockLocationsWorkflow',
			'deleteApiKeysWorkflow'
		]
		for (const name of blocked) {
			expect(isBlockedWorkflowName(name)).toBe(true)
		}
	})

	it('is case-insensitive (catches DELETE, Delete, delete anywhere in the name)', () => {
		expect(isBlockedWorkflowName('DELETECUSTOMERSWORKFLOW')).toBe(true)
		expect(isBlockedWorkflowName('softDeleteUsersWorkflow')).toBe(true)
		expect(isBlockedWorkflowName('myCustomDeleteFlow')).toBe(true)
	})

	it('allows ordinary create/update/cancel workflows', () => {
		const allowed = [
			'createCustomersWorkflow',
			'updateCustomersWorkflow',
			'cancelOrderWorkflow',
			'archiveOrderWorkflow',
			'capturePaymentWorkflow',
			'refundPaymentWorkflow'
		]
		for (const name of allowed) {
			expect(isBlockedWorkflowName(name)).toBe(false)
		}
	})

	it('treats null/undefined/empty as not blocked (other validation handles missing names)', () => {
		expect(isBlockedWorkflowName(null)).toBe(false)
		expect(isBlockedWorkflowName(undefined)).toBe(false)
		expect(isBlockedWorkflowName('')).toBe(false)
	})
})
