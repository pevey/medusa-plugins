import { MedusaService } from '@medusajs/framework/utils'
import { AutomationTrigger } from './models/automation-trigger'
import { AutomationAction } from './models/automation-action'
import { AutomationDelivery } from './models/automation-delivery'
import { AutomationReceipt } from './models/automation-receipt'
import { AutomationQuery } from './models/automation-query'
import { AutomationSecret } from './models/automation-secret'
import { AutomationOptions } from './types'
import { Encryptor } from './encryption'
import { SsrfGuard } from '../../lib/ssrf'
import { SignatureCache } from '../../lib/signature-cache'

export class AutomationService extends MedusaService({ AutomationTrigger, AutomationAction, AutomationDelivery, AutomationReceipt, AutomationQuery, AutomationSecret }) {
	protected readonly options_: AutomationOptions
	protected readonly encryptor_: Encryptor
	protected readonly ssrfGuard_: SsrfGuard
	protected readonly signatureCache_: SignatureCache

	constructor(_container: object, options: AutomationOptions) {
		super(...arguments)
		if (!options || typeof options !== 'object') {
			throw new Error(
				'Automation plugin requires options including `secret`. ' +
				'See AutomationOptions for details.'
			)
		}
		this.options_ = options
		this.encryptor_ = new Encryptor(options.secret)
		this.ssrfGuard_ = new SsrfGuard(options.ssrf)
		this.signatureCache_ = new SignatureCache()
	}

	getOptions(): AutomationOptions {
		return this.options_
	}

	getSsrfGuard(): SsrfGuard {
		return this.ssrfGuard_
	}

	getSignatureCache(): SignatureCache {
		return this.signatureCache_
	}

	encryptSecret(plaintext: string): string {
		return this.encryptor_.encrypt(plaintext)
	}

	decryptSecret(stored: string): string {
		return this.encryptor_.decrypt(stored)
	}
}
