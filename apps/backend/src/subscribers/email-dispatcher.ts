import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
import { ContainerRegistrationKeys } from '@medusajs/framework/utils'
import { sendAuthResetPasswordNotificationWorkflow } from '../workflows/notifications/auth-reset-password'
import { inviteUserWorkflow } from '../workflows/notifications/invite-sent'
import { inviteAcceptedWorkflow } from '../workflows/notifications/invite-accepted'
import { sendOrderPlacedNotificationWorkflow } from '../workflows/notifications/order-placed'
import { sendShipmentCreatedNotificationWorkflow } from '../workflows/notifications/shipment-created'
import { sendDeliveryCreatedNotificationWorkflow } from '../workflows/notifications/delivery-created'
import { orderNoteNotificationWorkflow } from '../workflows/notifications/order-note'
import { sendFormSubmissionNotificationWorkflow } from '../workflows/notifications/form-submission'

export const config: SubscriberConfig = {
	event: [
		'auth.password_reset',
		'invite.created',
		'invite.accepted',
		'order.placed',
		'shipment.created',
		'delivery.created',
		'order-note.created',
		'form.submitted'
	]
}

type EventPayloadWithId = { id: string }
type EventPayloadForAuth = { entity_id: string; token: string; actor_type: string }
type EventPayloadForShipment = { id: string; no_notification: boolean }

type EventPayload = EventPayloadWithId | EventPayloadForAuth | EventPayloadForShipment

export default async function emailDispatchHandler({
	event: { data, name },
	container
}: SubscriberArgs<EventPayload>) {
	switch (name) {
		case 'auth.password_reset':
			await sendAuthResetPasswordNotificationWorkflow(container).run({
				input: { ...(data as EventPayloadForAuth) }
			})
			break
		case 'delivery.created':
			await sendDeliveryCreatedNotificationWorkflow(container).run({
				input: (data as EventPayloadWithId).id
			})
			break
		case 'invite.accepted':
			await inviteAcceptedWorkflow(container).run({
				input: (data as EventPayloadWithId).id
			})
			break
		case 'invite.created':
			await inviteUserWorkflow(container).run({
				input: (data as EventPayloadWithId).id
			})
			break
		case 'order.placed':
			await sendOrderPlacedNotificationWorkflow(container).run({
				input: (data as EventPayloadWithId).id
			})
			break
		case 'shipment.created': {
			const { id, no_notification } = data as EventPayloadForShipment
			if (!no_notification) {
				const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
				try {
					await sendShipmentCreatedNotificationWorkflow(container).run({ input: id })
				} catch (err) {
					logger.error(`email-dispatcher: shipment.created failed for ${id}: ${err instanceof Error ? err.message : JSON.stringify(err)}`)
				}
			}
			break
		}
		case 'order-note.created':
			await orderNoteNotificationWorkflow(container).run({
				input: (data as EventPayloadWithId).id
			})
			break
		case 'form.submitted':
			await sendFormSubmissionNotificationWorkflow(container).run({
				input: (data as EventPayloadWithId).id
			})
			break
		default:
			break
	}
}
