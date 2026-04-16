import {
	AdminCustomer,
	AdminOrder,
	AdminProduct,
	AdminUser,
	FindParams,
	PaginatedResponse
} from '@medusajs/framework/types'

export type AdminCustomerWithOrders = AdminCustomer & {
	orders: AdminOrder[]
}

export type AdminComplaintTag = {
	id: string
	value: string
	created_at: string
	updated_at: string
}

export type AdminComplaintHistory = {
	id: string
	created_at: string
	type: string
	user_id: string
	user: AdminUser
	data: Record<string, unknown>
	complaint_id: string
	complaint: AdminComplaint
}

export type ComplaintStatus = 'open' | 'closed'

export type ComplaintActivityType = 'open' | 'close' | 'note'

export type AdminComplaintActivity = {
	id: string
	complaint_id: string
	user_id: string
	type: ComplaintActivityType
	note?: string
	metadata?: Record<string, unknown>
	created_at: string
	updated_at: string
	user: AdminUser
}

export type AdminComplaintActivityResponse = {
	activities: AdminComplaintActivity[]
}

export type AdminComplaint = {
	id: string
	number: number
	status: ComplaintStatus
	description: string
	customer_id: string
	customer: AdminCustomer
	order_id: string
	order: AdminOrder
	product_id: string
	product: AdminProduct
	metadata?: Record<string, unknown> | null
	tags?: AdminComplaintTag[]
	history: AdminComplaintHistory[]
}

export type ComplaintProductStat = {
	id: string
	product_id: string
	total_orders: number
	total_complaints: number
	complaint_rate: number
	last_calculated_at: string | null
}

export interface ComplaintQueryParams extends FindParams {}

export interface AdminUpdateComplaintParams {
	id: string
	status?: string
	description?: string
	tag_ids?: string[]
}

export type AdminComplaintsResponse = PaginatedResponse<{
	complaints: AdminComplaint[]
}>

export type AdminComplaintResponse = {
	complaint: AdminComplaint
}

export type AdminUpdateComplaintResponse = {
	complaint: AdminComplaint
}

export type AdminComplaintTagsResponse = PaginatedResponse<{
	complaint_tags: AdminComplaintTag[]
}>

export type AdminComplaintTagResponse = {
	complaint_tag: AdminComplaintTag
}
