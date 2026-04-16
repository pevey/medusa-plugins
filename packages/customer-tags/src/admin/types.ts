import { AdminCustomer, AdminOrder, FindParams, PaginatedResponse } from '@medusajs/framework/types'

export type AdminCustomerTag = {
	id: string
	value: string
	created_at: string
	updated_at: string
}

export type CustomerWithTags = AdminCustomer & {
	customer_tags?: AdminCustomerTag[]
}

export type AdminOrderWithCustomerTags = AdminOrder & {
	customer?: CustomerWithTags
}

export interface CustomerTagQueryParams extends FindParams {}

export interface AdminUpdateCustomerTagParams {
	id: string
	value: string
}

export type AdminCustomerTagsResponse = PaginatedResponse<{
	customer_tags: AdminCustomerTag[]
}>

export type AdminCustomerTagResponse = {
	customer_tag: AdminCustomerTag
}

export type AdminUpdateCustomerTagResponse = {
	customer_tag: AdminCustomerTag
}
