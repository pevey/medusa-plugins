import { IEventBusService, Logger, InferTypeOf } from '@medusajs/framework/types'
import { MedusaService } from '@medusajs/framework/utils'
import { OrderNote } from './models/order-note'

type OrderNoteType = InferTypeOf<typeof OrderNote>

export class OrderNoteService extends MedusaService({ OrderNote }) {
	protected logger_: Logger
	protected eventBusService_: IEventBusService

	constructor(
		{ logger, event_bus }: { logger: Logger; event_bus: IEventBusService },
		_options?: any
	) {
		super(...arguments)
		this.logger_ = logger
		this.eventBusService_ = event_bus
	}

	async createNote(data: {
		order_id: string
		user_id: string
		note: string
		sent: boolean
		metadata?: Record<string, unknown> | null
	}): Promise<OrderNoteType> {
		const orderNote = await this.createOrderNotes(data)

		await this.eventBusService_.emit({
			name: 'order-note.created',
			data: { id: orderNote.id }
		})

		this.logger_.info(`Order note created: ${orderNote.id} (sent: ${data.sent})`)

		return orderNote
	}
}
