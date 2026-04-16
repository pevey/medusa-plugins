// import type { SubscriberArgs, SubscriberConfig } from '@medusajs/framework'
// import { Modules } from '@medusajs/framework/utils'
// import { Attachment, CreateNotificationDTO } from '@medusajs/framework/types'

// // This file is just an example of how to send an email with an attachment
// export function withAttachments(
// 	dto: CreateNotificationDTO,
// 	attachments: Attachment[]
// ): CreateNotificationDTO {
// 	// https://github.com/medusajs/medusa/issues/12702#issuecomment-2962038687
// 	return {
// 		...dto,
// 		attachments
// 	} as unknown as CreateNotificationDTO
// }

// const EVENT = 'customer.updated' as const

// export type CustomerUpdatedArgs = {
// 	id: string // id of the customer
// }

// export default async function emailAttachmentHandler({
// 	event: {
// 		data: { id: customerId }
// 	},
// 	container
// }: SubscriberArgs<CustomerUpdatedArgs>) {
// 	const customers = container.resolve(Modules.CUSTOMER)

// 	const customer = await customers.retrieveCustomer(customerId)

// 	const notifications = container.resolve(Modules.NOTIFICATION)

// 	const notification: CreateNotificationDTO = {
// 		receiver_id: customer.id,
// 		to: customer.email,
// 		channel: 'email',
// 		template: '',
// 		trigger_type: EVENT,
// 		content: {
// 			subject: 'Hello Medusa from SES!',
// 			text: 'You should see this text in your inbox.'
// 		}
// 	}

// 	const attachment: Attachment = {
// 		filename: 'test.csv',
// 		content: 'bmFtZSxhZ2UKQmFydG9zeiwyNg=='
// 	}

// 	await notifications.createNotifications(
// 		withAttachments(notification, [attachment])
// 	)
// }

// export const config: SubscriberConfig = {
// 	event: EVENT
// }
