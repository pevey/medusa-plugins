import { MedusaService } from '@medusajs/framework/utils'
import { AutomationTrigger } from './models/automation-trigger'
import { AutomationAction } from './models/automation-action'
import { AutomationDelivery } from './models/automation-delivery'
import { AutomationReceipt } from './models/automation-receipt'
import { AutomationQuery } from './models/automation-query'
import { AutomationSecret } from './models/automation-secret'
import { AutomationOptions } from './types'

export class AutomationService extends MedusaService({ AutomationTrigger, AutomationAction, AutomationDelivery, AutomationReceipt, AutomationQuery, AutomationSecret }) {
	protected readonly options_: AutomationOptions

	constructor(_container: object, options: AutomationOptions = {}) {
		super(...arguments)
		this.options_ = options
	}

	getOptions(): AutomationOptions {
		return this.options_
	}
}
