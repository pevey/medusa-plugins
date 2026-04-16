import { MedusaService } from '@medusajs/framework/utils'
import { Logger } from '@medusajs/framework/types'
import { Complaint } from './models/complaint'
import { ComplaintTag } from './models/complaint-tag'
import { ComplaintProductStat } from './models/complaint-product-stat'
import { ComplaintActivity, ComplaintActivityType } from './models/complaint-activity'

export class ComplaintService extends MedusaService({
	Complaint,
	ComplaintTag,
	ComplaintActivity,
	ComplaintProductStat
}) {
	protected logger_: Logger

	constructor(container: { logger: Logger }, _options?: any) {
		super(...arguments)
		this.logger_ = container.logger
	}

	async addNote(complaintId: string, userId: string, note: string) {
		return await this.createComplaintActivities({
			complaint_id: complaintId,
			user_id: userId,
			type: ComplaintActivityType.NOTE,
			note
		})
	}

	async updateNote(noteId: string, note: string) {
		return await this.updateComplaintActivities({
			id: noteId,
			note
		})
	}

	async addCloseEntry(complaintId: string, userId: string) {
		return this.createComplaintActivities({
			complaint_id: complaintId,
			user_id: userId,
			type: ComplaintActivityType.CLOSE
		})
	}

	async addOpenEntry(complaintId: string, userId: string) {
		return this.createComplaintActivities({
			complaint_id: complaintId,
			user_id: userId,
			type: ComplaintActivityType.OPEN
		})
	}

	async calculateComplaintRates(orderCountsByProduct: Record<string, number>): Promise<void> {
		this.logger_.info(`Calculating complaint rates for ${Object.keys(orderCountsByProduct).length} products`)
		const [complaints] = await this.listAndCountComplaints({}, { select: ['id', 'product_id'] })

		const complaintsByProduct: Record<string, number> = {}
		for (const complaint of complaints) {
			if (!complaint.product_id) continue
			complaintsByProduct[complaint.product_id] =
				(complaintsByProduct[complaint.product_id] || 0) + 1
		}

		// for (const [productId, complaintCount] of Object.entries(complaintsByProduct)) {
		for (const productId in orderCountsByProduct) {
			const complaintCount = complaintsByProduct[productId] ?? 0
			const totalOrders = orderCountsByProduct[productId] ?? 0
			const complaintRate = totalOrders > 0 ? complaintCount / totalOrders : 0

			const [existing] = await this.listComplaintProductStats({
				product_id: productId
			})

			if (existing) {
				await this.updateComplaintProductStats({
					id: existing.id,
					total_complaints: complaintCount,
					total_orders: totalOrders,
					complaint_rate: complaintRate,
					last_calculated_at: new Date()
				})
			} else {
				await this.createComplaintProductStats({
					product_id: productId,
					total_complaints: complaintCount,
					total_orders: totalOrders,
					complaint_rate: complaintRate,
					last_calculated_at: new Date()
				})
			}
		}
	}
}
