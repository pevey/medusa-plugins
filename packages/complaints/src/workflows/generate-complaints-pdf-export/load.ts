import type { ComplaintForExport } from './types'

type Query = {
	graph: (args: {
		entity: string
		fields: string[]
		filters?: Record<string, unknown>
	}) => Promise<{ data: any[] }>
}

export async function loadComplaintsForExport(query: Query, ids: string[]): Promise<ComplaintForExport[]> {
	if (ids.length === 0) return []

	const { data: complaints } = await query.graph({
		entity: 'complaint',
		fields: [
			'id', 'number', 'status', 'description',
			'customer_id', 'order_id', 'product_id',
			'actionable', 'reportable',
			'tags.id', 'tags.value',
			'activity.id', 'activity.type', 'activity.note', 'activity.created_at',
			'activity.user_id',
			'documents.id', 'documents.filename', 'documents.mime_type',
			'documents.size_bytes', 'documents.file_key', 'documents.created_at'
		],
		filters: { id: ids }
	})

	const customerIds = unique(complaints.map((c: any) => c.customer_id).filter(Boolean))
	const orderIds    = unique(complaints.map((c: any) => c.order_id).filter(Boolean))
	const productIds  = unique(complaints.map((c: any) => c.product_id).filter(Boolean))
	const userIds     = unique(
		complaints.flatMap((c: any) =>
			(c.activity ?? []).map((a: any) => a.user_id).filter(Boolean)
		)
	)

	const [customers, orders, products, users] = await Promise.all([
		fetchOrEmpty(query, 'customer', ['id', 'email', 'first_name', 'last_name'], customerIds),
		fetchOrEmpty(query, 'order', ['id', 'display_id', 'created_at'], orderIds),
		fetchOrEmpty(query, 'product', ['id', 'title', 'handle'], productIds),
		fetchOrEmpty(query, 'user', ['id', 'email'], userIds)
	])

	const customerById = byId(customers)
	const orderById = byId(orders)
	const productById = byId(products)
	const userById = byId(users)

	const complaintsById = new Map<string, ComplaintForExport>()
	for (const c of complaints) {
		const orderRow = c.order_id ? orderById.get(c.order_id) : undefined
		complaintsById.set(c.id, {
			complaint: {
				id: c.id,
				number: c.number,
				status: c.status,
				description: c.description ?? '',
				actionable: !!c.actionable,
				reportable: !!c.reportable,
				customer_id: c.customer_id,
				order_id: c.order_id ?? null,
				product_id: c.product_id ?? null,
				tags: c.tags ?? [],
				activity: (c.activity ?? []).map((a: any) => ({
					id: a.id,
					type: a.type,
					note: a.note ?? null,
					user: a.user_id ? (userById.get(a.user_id) ?? { id: a.user_id, email: a.user_id }) : null,
					created_at: new Date(a.created_at)
				})),
				documents: (c.documents ?? []).map((d: any) => ({
					id: d.id,
					filename: d.filename,
					mime_type: d.mime_type,
					size_bytes: d.size_bytes,
					file_key: d.file_key,
					created_at: new Date(d.created_at)
				}))
			},
			customer: c.customer_id ? customerById.get(c.customer_id) ?? null : null,
			order: orderRow
				? { ...orderRow, created_at: new Date(orderRow.created_at) }
				: null,
			product: c.product_id ? productById.get(c.product_id) ?? null : null
		})
	}

	const out: ComplaintForExport[] = []
	for (const id of ids) {
		const found = complaintsById.get(id)
		if (found) out.push(found)
	}
	return out
}

async function fetchOrEmpty(query: Query, entity: string, fields: string[], ids: string[]): Promise<any[]> {
	if (ids.length === 0) return []
	const { data } = await query.graph({ entity, fields, filters: { id: ids } })
	return data ?? []
}

function unique<T>(xs: T[]): T[] {
	return Array.from(new Set(xs))
}

function byId<T extends { id: string }>(xs: T[]): Map<string, T> {
	const m = new Map<string, T>()
	for (const x of xs) m.set(x.id, x)
	return m
}
