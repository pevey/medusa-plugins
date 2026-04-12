import {
	AbstractPaymentProvider,
	ContainerRegistrationKeys,
	MathBN,
	MedusaError,
	Modules,
	PaymentActions,
	PaymentSessionStatus,
	isDefined
} from '@medusajs/framework/utils'
import type {
	AuthorizePaymentInput,
	AuthorizePaymentOutput,
	CancelPaymentInput,
	CancelPaymentOutput,
	CapturePaymentInput,
	CapturePaymentOutput,
	CreateAccountHolderInput,
	CreateAccountHolderOutput,
	DeleteAccountHolderInput,
	DeleteAccountHolderOutput,
	DeletePaymentInput,
	DeletePaymentOutput,
	GetPaymentStatusInput,
	GetPaymentStatusOutput,
	ICachingModuleService,
	InitiatePaymentInput,
	InitiatePaymentOutput,
	Logger,
	PaymentAccountHolderDTO,
	PaymentCustomerDTO,
	PaymentProviderContext,
	ProviderWebhookPayload,
	RefundPaymentInput,
	RefundPaymentOutput,
	RetrievePaymentInput,
	RetrievePaymentOutput,
	SavePaymentMethodInput,
	SavePaymentMethodOutput,
	UpdateAccountHolderInput,
	UpdateAccountHolderOutput,
	UpdatePaymentInput,
	UpdatePaymentOutput,
	WebhookActionResult
} from '@medusajs/types'
import type { Transaction, TransactionNotification, TransactionStatus } from 'braintree'
import Braintree from 'braintree'
import { z } from 'zod'
import { formatToTwoDecimalString } from './utils'
import type { BraintreeOptions, CustomFields } from './types'

export type BraintreeTransactionContext = PaymentProviderContext &
	Pick<
		Braintree.TransactionRequest,
		| 'billing'
		| 'shipping'
		| 'customFields'
		| 'orderId'
		| 'lineItems'
		| 'shippingAmount'
		| 'taxAmount'
		| 'shippingTaxAmount'
		| 'discountAmount'
		| 'customer'
		| 'deviceData'
	>

export interface BraintreePaymentSessionData {
	client_token: string
	transaction: Transaction
	amount: number
	currency_code: string
	payment_method_nonce?: string
	account_holder?: PaymentAccountHolderDTO
	context?: BraintreeTransactionContext
}

export interface BraintreeInitiatePaymentData {
	payment_method_nonce?: string
}

const buildTokenCacheKey = (customerId: string) => `braintree:clientToken:${customerId}`

// Type guard utilities for safe type validation
const validateString = (value: unknown, fieldName: string): string => {
	if (typeof value !== 'string' || !value.trim()) {
		throw new MedusaError(
			MedusaError.Types.INVALID_ARGUMENT,
			`${fieldName} must be a non-empty string`
		)
	}
	return value
}

// Error handling utility that preserves full error context
export const buildBraintreeError = (
	error: unknown,
	operation: string,
	logger: Logger,
	context?: Record<string, unknown>
): MedusaError => {
	const errorMessage = error instanceof Error ? error.message : String(error)

	// Preserve full error context in logging
	logger.error(
		`Braintree ${operation} failed: ${errorMessage}`,
		error instanceof Error ? error : undefined
	)

	return new MedusaError(MedusaError.Types.INVALID_DATA, `Failed to ${operation}: ${errorMessage}`)
}

export class BraintreeProvider extends AbstractPaymentProvider<BraintreeOptions> {
	static identifier = 'braintree'
	protected readonly options_: BraintreeOptions
	protected gateway!: Braintree.BraintreeGateway
	logger: Logger
	caching: ICachingModuleService

	constructor(
		container: {
			logger: Logger
			caching: ICachingModuleService
		},
		options: BraintreeOptions
	) {
		super(container, options)
		this.options_ = options
		this.logger = container[ContainerRegistrationKeys.LOGGER]
		this.caching = container[Modules.CACHING]
		this.init()
	}

	async saveClientTokenToCache(
		clientToken: string,
		customerId: string,
		expiresOnEpochSeconds: number
	): Promise<void> {
		if (!customerId)
			throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, 'Customer ID is required')
		const nowSeconds = Math.floor(Date.now() / 1000)
		const ttlSeconds = expiresOnEpochSeconds - nowSeconds - 1
		if (!customerId || !clientToken || ttlSeconds <= 0) return
		await this.caching.set({
			key: buildTokenCacheKey(customerId),
			data: { token: clientToken },
			ttl: ttlSeconds
		})
	}

	async getClientTokenFromCache(customerId: string): Promise<string | null> {
		const cached = (await this.caching.get({ key: buildTokenCacheKey(customerId) })) as {
			token: string
		} | null
		return cached?.token ?? null
	}

	async getValidClientToken(
		medusaCustomerId: string | undefined,
		accountHolder: PaymentAccountHolderDTO | undefined
	): Promise<string | null> {
		if (!medusaCustomerId) {
			const generatedToken = await this.gateway.clientToken.generate({})
			return generatedToken.clientToken
		}

		const token = await this.getClientTokenFromCache(medusaCustomerId)

		if (token) return token

		const generatedToken = await this.gateway.clientToken.generate({})

		const defaultExpiryEpochSeconds = Math.floor(Date.now() / 1000) + 24 * 3600 // 24 hours default

		await this.saveClientTokenToCache(
			generatedToken.clientToken,
			medusaCustomerId,
			defaultExpiryEpochSeconds
		)
		return generatedToken.clientToken
	}

	private async parsePaymentSessionData(
		data: Record<string, unknown>
	): Promise<BraintreePaymentSessionData> {
		const schema = z.object({
			clientToken: z.string().optional(),
			client_token: z.string().optional(),
			amount: z.number().optional(),
			currency_code: z.string().optional(),
			paymentMethodNonce: z.string().optional(),
			payment_method_nonce: z.string().optional(),
			braintreeTransaction: z.any().optional(),
			transaction: z.any().optional(),
			account_holder: z.any().optional(),
			context: z
				.object({
					orderId: z.string().optional(),
					customerId: z.string().optional(),
					customer: z
						.object({
							firstName: z.string(),
							lastName: z.string(),
							email: z.string().email(),
							phone: z.string().optional()
						})
						.optional(),
					shipping: z
						.object({
							firstName: z.string(),
							lastName: z.string(),
							streetAddress: z.string(),
							extendedAddress: z.string().optional(),
							locality: z.string(),
							region: z.string(),
							postalCode: z.string(),
							countryCodeAlpha2: z.string()
						})
						.optional(),
					billing: z
						.object({
							firstName: z.string(),
							lastName: z.string(),
							streetAddress: z.string(),
							extendedAddress: z.string().optional(),
							locality: z.string(),
							region: z.string(),
							postalCode: z.string(),
							countryCodeAlpha2: z.string()
						})
						.optional(),
					deviceData: z.string().optional(),
					customFields: z.any().optional()
				})
				.optional()
		})

		const result = schema.safeParse(data)
		if (!result.success) {
			throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, result.error.message)
		}

		result.data.transaction = result.data.transaction ?? result.data.braintreeTransaction
		result.data.client_token = result.data.client_token ?? result.data.clientToken
		result.data.payment_method_nonce =
			result.data.payment_method_nonce ?? result.data.paymentMethodNonce

		return result.data as BraintreePaymentSessionData
	}

	init(): void {
		const envKey = (this.options_.environment || 'sandbox').toLowerCase()
		const envMap: Record<string, Braintree.Environment> = {
			qa: Braintree.Environment.Qa,
			sandbox: Braintree.Environment.Sandbox,
			production: Braintree.Environment.Production,
			development: Braintree.Environment.Development
		}
		const environment = envMap[envKey] ?? Braintree.Environment.Sandbox

		this.gateway =
			this.gateway ||
			new Braintree.BraintreeGateway({
				environment,
				merchantId: this.options_.merchantId!,
				publicKey: this.options_.publicKey!,
				privateKey: this.options_.privateKey!
			})
	}

	static validateOptions(options: BraintreeOptions): void {
		const requiredStringFields: (keyof BraintreeOptions)[] = [
			'merchantId',
			'publicKey',
			'privateKey',
			'webhookSecret',
			'environment'
		]

		for (const field of requiredStringFields) {
			if (!isDefined(options[field]) || typeof options[field] !== 'string') {
				throw new MedusaError(
					MedusaError.Types.INVALID_ARGUMENT,
					`Required option "${field}" is missing or invalid in Braintree plugin`
				)
			}
		}

		const validEnvironments = ['qa', 'sandbox', 'production', 'development']
		if (!validEnvironments.includes(options.environment.toLowerCase())) {
			throw new MedusaError(
				MedusaError.Types.INVALID_ARGUMENT,
				`Invalid environment "${options.environment}" in Braintree plugin. Must be one of: ${validEnvironments.join(', ')}`
			)
		}

		options.enable3DSecure = options.enable3DSecure ?? false
		options.savePaymentMethod = options.savePaymentMethod ?? false
		options.autoCapture = options.autoCapture ?? false
		options.allowRefundOnRefunded = options.allowRefundOnRefunded ?? false

		const booleanFields: (keyof BraintreeOptions)[] = [
			'enable3DSecure',
			'savePaymentMethod',
			'autoCapture',
			'allowRefundOnRefunded'
		]
		for (const field of booleanFields) {
			if (isDefined(options[field]) && typeof options[field] !== 'boolean') {
				throw new MedusaError(
					MedusaError.Types.INVALID_ARGUMENT,
					`Option "${field}" must be a boolean in Braintree plugin`
				)
			}
		}
	}

	async capturePayment(input: CapturePaymentInput): Promise<CapturePaymentOutput> {
		const sessionData = await this.parsePaymentSessionData(input.data ?? {})
		const transaction = sessionData.transaction

		if (!transaction) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Braintree transaction not found')
		}

		const paymentsResponse = await this.gateway.transaction.find(transaction.id)

		switch (paymentsResponse.status) {
			case 'authorized': {
				const { id, amount } = paymentsResponse
				const toPay = amount.toString()

				const captureResult = await this.gateway.transaction.submitForSettlement(id, toPay)

				if (captureResult.success) {
					const _transaction = await this.retrieveTransaction(transaction.id)

					return {
						data: {
							...input.data,
							transaction: _transaction
						}
					}
				}

				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`No payments found for transaction ${transaction.id}`
				)
			}
			case 'settled':
			case 'settling':
			case 'submitted_for_settlement': {
				const _transaction = await this.retrieveTransaction(transaction.id)

				return {
					data: {
						...input.data,
						transaction: _transaction
					}
				}
			}

			default: {
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Not in a state to settle ${transaction.id}`
				)
			}
		}
	}

	async authorizePayment(input: AuthorizePaymentInput): Promise<AuthorizePaymentOutput> {
		try {
			const sessionData = await this.parsePaymentSessionData(input.data ?? {})

			let transaction = sessionData.transaction

			if (!sessionData.payment_method_nonce)
				throw new MedusaError(
					MedusaError.Types.INVALID_ARGUMENT,
					'Payment method nonce is required'
				)

			if (!transaction) {
				transaction = await this.createTransaction({
					input
				})
			}

			const paymentStatusRequest: GetPaymentStatusInput = {
				...input,
				data: {
					...input.data,
					transaction
				}
			}

			const status = await this.getPaymentStatus(paymentStatusRequest)

			const finalStatus =
				status.status === 'authorized' && this.options_.autoCapture ? 'captured' : status.status

			return {
				data: {
					...input.data,
					transaction
				},
				status: finalStatus
			}
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error'
			this.logger.error(
				`Error authorizing transaction: ${message}`,
				error instanceof Error ? error : undefined
			)
			throw new MedusaError(MedusaError.Types.INVALID_DATA, message)
		}
	}

	async cancelPayment(input: CancelPaymentInput): Promise<CancelPaymentOutput> {
		const sessionData = await this.parsePaymentSessionData(input.data ?? {})
		const transaction = await this.retrieveTransaction(sessionData.transaction?.id as string)

		if (!transaction) return {}

		if (
			transaction.status === 'authorized' ||
			transaction.status === 'submitted_for_settlement' ||
			(transaction.status === 'settling' &&
				transaction.paymentInstrumentType === 'paypal_account')
		) {
			const updatedTransaction = await this.gateway.transaction.void(transaction.id as string)

			if (updatedTransaction) {
				const updated = await this.retrieveTransaction(transaction.id)
				return {
					data: {
						...input.data,
						transaction: updated
					}
				}
			}

			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`No payments found for transaction ${transaction.id}`
			)
		}

		throw new MedusaError(
			MedusaError.Types.NOT_FOUND,
			`Payment cannot be cancelled ${transaction.id}`
		)
	}

	private async retrieveTransaction(
		id: string,
		throwOnMissing: boolean = true
	): Promise<Transaction> {
		const transactionData = await this.gateway.transaction.find(id)

		if (!transactionData && throwOnMissing)
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Braintree transaction not found: ${id}`
			)

		return transactionData
	}

	private mapTransactionStatusToPaymentStatus(status: TransactionStatus): PaymentSessionStatus {
		switch (status) {
			case 'authorization_expired':
				return PaymentSessionStatus.CANCELED
			case 'authorizing':
				return PaymentSessionStatus.REQUIRES_MORE
			case 'authorized':
				return PaymentSessionStatus.AUTHORIZED
			case 'settled':
			case 'settlement_confirmed':
				return PaymentSessionStatus.CAPTURED
			case 'settling':
			case 'settlement_pending':
			case 'submitted_for_settlement':
				return PaymentSessionStatus.AUTHORIZED
			case 'voided':
				return PaymentSessionStatus.CANCELED
			case 'failed':
				return PaymentSessionStatus.ERROR
			default:
				return PaymentSessionStatus.PENDING
		}
	}

	private validateInitiatePaymentData(
		data: Record<string, unknown>
	): BraintreeInitiatePaymentData {
		const schema = z.object({
			paymentMethodNonce: z.string().optional(),
			payment_method_nonce: z.string().optional(),
			cardDetails: z
				.object({
					cardType: z.string().optional(),
					lastFour: z.string().optional(),
					lastTwo: z.string().optional(),
					expirationMonth: z.string().optional(),
					expirationYear: z.string().optional(),
					cardholderName: z.string().optional()
				})
				.optional()
		})

		const result = schema.safeParse(data)

		if (!result.success) {
			throw new MedusaError(MedusaError.Types.INVALID_ARGUMENT, result.error.message)
		}

		result.data.payment_method_nonce =
			result.data.payment_method_nonce ?? result.data.paymentMethodNonce

		return result.data
	}

	async initiatePayment(input: InitiatePaymentInput): Promise<InitiatePaymentOutput> {
		const data = this.validateInitiatePaymentData(input.data ?? {})

		let transaction: Transaction | undefined

		const token = await this.getValidClientToken(
			input.context?.customer?.id,
			input.context?.account_holder
		)

		const paymentSessionId = validateString(input.context?.idempotency_key, 'Payment session ID')

		if (!token) {
			throw new MedusaError(
				MedusaError.Types.INVALID_ARGUMENT,
				'Failed to generate client token'
			)
		}

		const dataToSave: BraintreePaymentSessionData = {
			transaction: transaction as Transaction,
			client_token: token,
			payment_method_nonce: data?.payment_method_nonce as string,
			amount: Number(input.amount),
			currency_code: input.currency_code,
			account_holder: input.context?.account_holder
		}

		return {
			id: paymentSessionId!,
			data: { ...dataToSave }
		}
	}

	private async createTransaction({
		input
	}: {
		input: AuthorizePaymentInput
	}): Promise<Transaction> {
		const sessionData = await this.parsePaymentSessionData(input.data ?? {})
		const { context } = sessionData

		let transactionRequest: Braintree.TransactionRequest = {
			amount: formatToTwoDecimalString(Number(sessionData.amount)),
			paymentMethodNonce: validateString(
				sessionData.payment_method_nonce,
				'Payment method nonce'
			),
			options: {
				submitForSettlement: this.options_.autoCapture,
				storeInVaultOnSuccess: this.options_.savePaymentMethod,
				storeInVault: this.options_.savePaymentMethod,
				threeDSecure: this.options_.enable3DSecure
					? {
							required: this.options_.enable3DSecure
						}
					: undefined
			}
		}

		if (context?.orderId) transactionRequest.orderId = context.orderId
		if (context?.customer) transactionRequest.customer = context.customer
		if (context?.shipping) transactionRequest.shipping = context.shipping
		if (context?.billing) transactionRequest.billing = context.billing
		if (context?.deviceData) transactionRequest.deviceData = context.deviceData
		if (context?.customFields) transactionRequest.customFields = context.customFields

		try {
			const saleResponse = await this.gateway.transaction.sale(transactionRequest)

			if (!saleResponse.success) {
				throw new MedusaError(
					MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
					saleResponse.transaction?.gatewayRejectionReason ?? 'Unknown error'
				)
			}

			try {
				return await this.retrieveTransaction(saleResponse.transaction.id)
			} catch (error) {
				if (saleResponse.transaction?.id) {
					await this.gateway.transaction.void(saleResponse.transaction.id)
				}
				throw buildBraintreeError(error, 'sync payment session', this.logger, {
					transactionId: saleResponse.transaction?.id
				})
			}
		} catch (error) {
			throw buildBraintreeError(error, 'create Braintree transaction', this.logger)
		}
	}

	async deletePayment(input: DeletePaymentInput): Promise<DeletePaymentOutput> {
		const sessionData = await this.parsePaymentSessionData(input.data ?? {})
		const transaction = sessionData.transaction

		if (transaction) {
			try {
				const result = await this.cancelPayment(input)

				return {
					data: {
						...input.data,
						transaction: result.data?.transaction
					}
				}
			} catch (e) {
				throw buildBraintreeError(e, 'delete Braintree payment', this.logger)
			}
		} else {
			return {
				data: {
					...input.data,
					transaction
				}
			}
		}
	}

	async getPaymentStatus(input: GetPaymentStatusInput): Promise<GetPaymentStatusOutput> {
		// Support both `data.transaction` and `data.braintreeTransaction` without requiring full session parsing
		const tx = (input.data?.transaction ?? input.data?.braintreeTransaction) as
			| Transaction
			| undefined
		const id = tx?.id as string | undefined

		if (!id) {
			return { status: PaymentSessionStatus.PENDING }
		}

		let transaction: Transaction
		try {
			transaction = await this.gateway.transaction.find(id)
		} catch (e) {
			this.logger.warn('received payment data from session not transaction data')
			throw e
		}
		const status = this.mapTransactionStatusToPaymentStatus(transaction.status)
		return { status }
	}

	async savePaymentMethod(input: SavePaymentMethodInput): Promise<SavePaymentMethodOutput> {
		const sessionData = await this.parsePaymentSessionData(input.data ?? {})

		const braintreeCustomerId = validateString(
			input.context?.account_holder?.data?.id,
			'Braintree customer ID'
		)

		const paymentMethodNonce = sessionData?.payment_method_nonce

		if (!paymentMethodNonce) {
			throw new MedusaError(
				MedusaError.Types.INVALID_ARGUMENT,
				'Payment method nonce is required'
			)
		}

		const paymentMethodResult = await this.gateway.paymentMethod.create({
			customerId: braintreeCustomerId,
			paymentMethodNonce: paymentMethodNonce
		})

		if (!paymentMethodResult.success) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Failed to save payment method: ${JSON.stringify(paymentMethodResult.errors)}`
			)
		}

		return {
			id: paymentMethodResult.paymentMethod.token,
			data: {
				...input.data
			}
		}
	}

	async refundPayment(input: RefundPaymentInput): Promise<RefundPaymentOutput> {
		const sessionData = await this.parsePaymentSessionData(input.data ?? {})

		const refundAmountBN = MathBN.convert(input.amount, 2)
		const refundAmount = refundAmountBN.toNumber()

		if (!refundAmount)
			throw new MedusaError(MedusaError.Types.INVALID_DATA, 'Refund amount is invalid')

		let transaction = await this.retrieveTransaction(sessionData.transaction?.id as string)

		let shouldVoid = ['submitted_for_settlement', 'authorized'].includes(transaction.status)

		if (process.env.TEST_FORCE_SETTLED === 'true') {
			shouldVoid = false
			await this.gateway.testing.settle(transaction.id)
			transaction = await this.retrieveTransaction(transaction.id)
		}

		if (shouldVoid) {
			const voidResponse = await this.gateway.transaction.void(transaction.id)
			const voidSucceeded = voidResponse.success ?? false

			if (!voidSucceeded)
				throw new MedusaError(
					MedusaError.Types.PAYMENT_AUTHORIZATION_ERROR,
					'Failed to void transaction'
				)

			const voidedTransaction =
				voidResponse?.transaction ?? (await this.retrieveTransaction(transaction.id))

			const refundResult: RefundPaymentOutput = {
				data: {
					...input.data,
					transaction: voidedTransaction,
					braintreeRefund: {
						success: true,
						transactionId: voidedTransaction?.id,
						type: 'void'
					}
				}
			}

			return refundResult
		}

		const shouldRefund = ['settled', 'settling'].includes(transaction.status)

		if (!shouldRefund) {
			this.logger.error(
				`Braintree transaction with ID ${transaction.id} cannot be refunded because it's in status ${transaction.status}`
			)
			throw new MedusaError(
				MedusaError.Types.NOT_FOUND,
				`Braintree transaction with ID ${transaction.id} cannot be refunded`
			)
		}

		if (transaction.id) {
			const refundAmountDecimal = formatToTwoDecimalString(refundAmount)
			try {
				this.logger.info(
					`Refunding transaction: ${transaction.id} with amount: ${refundAmountDecimal} (created from ${refundAmount})`
				)

				const refundResponse = await this.gateway.transaction.refund(
					transaction.id,
					refundAmountDecimal
				)

				const refundSucceeded = refundResponse.success ?? false
				if (!refundSucceeded)
					throw new MedusaError(
						MedusaError.Types.INVALID_DATA,
						`Failed to create Braintree refund: ${refundResponse.message}`
					)

				const refundTransaction =
					refundResponse.transaction ?? (await this.retrieveTransaction(transaction.id))

				const refundResult: RefundPaymentOutput = {
					data: {
						...input.data,
						transaction: refundTransaction,
						braintreeRefund: refundTransaction
					}
				}
				return refundResult
			} catch (e) {
				throw buildBraintreeError(e, 'create Braintree refund', this.logger)
			}
		}

		throw new MedusaError(
			MedusaError.Types.NOT_FOUND,
			`Braintree transaction with ID ${transaction.id} not found`
		)
	}

	async retrievePayment(input: RetrievePaymentInput): Promise<RetrievePaymentOutput> {
		const paymentSessionData = await this.parsePaymentSessionData(input.data ?? {})

		if (!paymentSessionData.transaction?.id) {
			throw new MedusaError(MedusaError.Types.NOT_FOUND, 'Braintree transaction not found')
		}

		const retrieved = await this.retrieveTransaction(paymentSessionData.transaction?.id)

		return {
			data: {
				...input.data,
				transaction: retrieved
			}
		}
	}

	async updatePayment(input: UpdatePaymentInput): Promise<UpdatePaymentOutput> {
		return Promise.resolve({
			data: {
				...input.data,
				amount: input.amount,
				currency_code: input.currency_code
			}
		})
	}

	async createAccountHolder(input: CreateAccountHolderInput): Promise<CreateAccountHolderOutput> {
		const customer = await this.createBraintreeCustomer(input.context.customer)

		return {
			id: customer.id,
			data: {
				...customer
			}
		}
	}

	async updateAccountHolder(input: UpdateAccountHolderInput): Promise<UpdateAccountHolderOutput> {
		const { context } = input
		const accountHolderId = context.account_holder?.data?.id as string
		if (!accountHolderId) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `Account holder id is required`)
		}
		try {
			const accountHolder = await this.gateway.customer.find(accountHolderId)
			if (!accountHolder) {
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Account holder with id ${accountHolderId} not found`
				)
			}
			const customerUpdateRequest: Braintree.CustomerUpdateRequest = {
				firstName: input.context.customer?.first_name ?? accountHolder.firstName,
				lastName: input.context.customer?.last_name ?? accountHolder.lastName,
				email: input.context.customer?.email ?? accountHolder.email,
				phone: input.context.customer?.phone ?? accountHolder.phone
			}

			const updateResult = await this.gateway.customer.update(
				accountHolder.id,
				customerUpdateRequest
			)

			if (!updateResult.success) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Failed to update account holder: ${JSON.stringify(updateResult.errors)}`
				)
			}

			return {
				data: { ...updateResult.customer }
			}
		} catch (e) {
			throw buildBraintreeError(e, 'update account holder', this.logger)
		}
	}

	async deleteAccountHolder(input: DeleteAccountHolderInput): Promise<DeleteAccountHolderOutput> {
		const { context } = input

		const accountHolderId = context.account_holder?.data?.id as string

		if (!accountHolderId)
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `Account holder id is required`)

		try {
			const accountHolder = await this.gateway.customer.find(accountHolderId)

			if (!accountHolder)
				throw new MedusaError(
					MedusaError.Types.NOT_FOUND,
					`Account holder with id ${accountHolderId} not found`
				)

			await this.gateway.customer.delete(accountHolder.id)

			return {
				data: {}
			}
		} catch (e) {
			throw buildBraintreeError(e, 'delete account holder', this.logger)
		}
	}

	async getWebhookActionAndData(
		webhookData: ProviderWebhookPayload['payload']
	): Promise<WebhookActionResult> {
		const logger = this.logger

		logger.info(`Received Braintree webhook with data: ${!!webhookData.data}`)

		const decodedPayload = new URLSearchParams(webhookData.data as unknown as string)

		let notification: TransactionNotification
		try {
			notification = (await this.gateway.webhookNotification.parse(
				decodedPayload.get('bt_signature') ?? '',
				decodedPayload.get('bt_payload') ?? ''
			)) as TransactionNotification

			if (!notification) {
				return { action: PaymentActions.FAILED }
			}
		} catch (error) {
			logger.error(`Braintree webhook validation failed : ${error}`)

			return { action: PaymentActions.FAILED }
		}

		const paymentData = await this.gateway.transaction.find(notification.transaction.id)

		const customFields = paymentData.customFields as CustomFields

		switch (notification.kind) {
			case 'transaction_settled':
				return {
					action: PaymentActions.SUCCESSFUL,
					data: {
						session_id: customFields.medusa_payment_session_id ?? '',
						amount: paymentData.amount
					}
				}

			case 'transaction_settlement_declined':
				return {
					action: PaymentActions.FAILED,
					data: {
						session_id: customFields.medusa_payment_session_id ?? '',
						amount: paymentData.amount
					}
				}

			default:
				return { action: PaymentActions.NOT_SUPPORTED }
		}
	}

	private async createBraintreeCustomer(
		customer: PaymentCustomerDTO
	): Promise<Braintree.Customer> {
		const customerResult = await this.gateway.customer.create({
			email: customer.email,
			firstName: customer.first_name ?? undefined,
			lastName: customer.last_name ?? undefined,
			phone: customer.phone ?? undefined
		})

		if (!customerResult.success) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Failed to create Braintree customer: ${JSON.stringify(customerResult.errors)}`
			)
		}

		return customerResult.customer
	}
}
