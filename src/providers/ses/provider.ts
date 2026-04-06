import { Logger, NotificationTypes } from '@medusajs/framework/types'
import { AbstractNotificationProviderService, MedusaError } from '@medusajs/framework/utils'
import { SESv2Client, SendEmailCommand } from '@aws-sdk/client-sesv2'
import * as nodemailer from 'nodemailer'
import type { Transporter, SendMailOptions } from 'nodemailer'
import type { Attachment } from 'nodemailer/lib/mailer'

export type SesClientConfig = {
	region: string
	credentials: {
		secretAccessKey: string
		accessKeyId: string
	}
}

export type SesNotificationProviderOptions = {
	channels: string[]
	sesClientConfig: SesClientConfig
	from: string
}

const SesError = (type: keyof typeof MedusaError.Types, message: string) => {
	return new MedusaError(type, `SES Notification Provider: ${message}`)
}

export class SesNotificationProvider extends AbstractNotificationProviderService {
	static identifier = 'ses'
	public sesClient: SESv2Client
	public transporter: Transporter
	protected logger_: Logger
	protected readonly options_: SesNotificationProviderOptions

	constructor(
		container: {
			logger: Logger
		},
		options: SesNotificationProviderOptions
	) {
		super()
		this.logger_ = container.logger
		this.options_ = options
		this.sesClient = new SESv2Client({
			...this.options_.sesClientConfig,
			apiVersion: '2010-12-01'
		})
		this.transporter = nodemailer.createTransport({
			SES: { sesClient: this.sesClient, SendEmailCommand }
		})
	}

	async send(
		notification: NotificationTypes.ProviderSendNotificationDTO
	): Promise<NotificationTypes.ProviderSendNotificationResultsDTO> {
		if (!notification) {
			throw SesError('INVALID_ARGUMENT', `Notification is not defined`)
		}

		if (notification.channel !== 'email') {
			throw SesError(
				'INVALID_ARGUMENT',
				`Notification is for channel email, got ${notification.channel}`
			)
		}

		if (!notification.content) {
			throw SesError('INVALID_DATA', `Notification has no content`)
		}

		let { subject, text, html } = notification.content

		const attachments =
			notification.attachments?.map<Attachment>(at => ({
				cid: at.id,
				filename: at.filename,
				content: at.content,
				contentType: at.content_type,
				encoding: 'base64',
				contentDisposition: at.disposition as Attachment['contentDisposition']
			})) ?? []

		let mailOptions: SendMailOptions = {
			from: notification.from || this.options_.from,
			to: notification.to,
			subject,
			text,
			html,
			attachments
		}

		try {
			const response = await this.transporter.sendMail(mailOptions)
			return { id: response.messageId }
		} catch (e: unknown) {
			const message = e instanceof Error ? e.message : 'unknown'
			throw SesError('UNEXPECTED_STATE', `Failed to send email: ${message}`)
		}
	}
}
