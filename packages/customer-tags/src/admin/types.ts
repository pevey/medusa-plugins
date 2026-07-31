import { AdminCustomer, AdminOrder, FindParams, PaginatedResponse } from '@medusajs/framework/types'

export type AdminCustomerTag = {
	id: string
	value: string
	created_at: string
	updated_at: string
}

// The widgets that read this only ever fetch `+customer_tags.id,+customer_tags.value`
// (they render `.id`/`.value` and nothing else), so `customer_tags` here is a narrower
// ref, not a full `AdminCustomerTag[]`. Widening this to the full type would silently
// overclaim `created_at`/`updated_at`/`metadata`/`deleted_at` are always present on this
// specific expansion path, when only what was explicitly requested actually is.
export type CustomerWithTags = AdminCustomer & {
	customer_tags?: Pick<AdminCustomerTag, 'id' | 'value'>[]
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

export type AdminDeleteCustomerTagsResponse = {
	deleted: string[]
}

export type AdminAddCustomerTagResponse = {
	customer_id: string
	tag: string
}

export type AdminRemoveCustomerTagResponse = {
	customer_id: string
	tag_id: string
	deleted: boolean
}
