import { model } from '@medusajs/framework/utils'

export const AutomationSecret = model.define('automationSecret', {
	id: model.id().primaryKey(),
	label: model.text(),
	secret: model.text() // HMAC key — stored plaintext, never returned via API after initial creation
})
