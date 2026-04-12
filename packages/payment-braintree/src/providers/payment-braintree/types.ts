import type Braintree from 'braintree'

export interface BraintreeOptions extends Braintree.ClientGatewayConfig {
	defaultCurrencyCode?: string
	environment: 'production' | 'sandbox' | 'development' | 'qa'
	merchantId: string
	publicKey: string
	privateKey: string
	enable3DSecure: boolean
	savePaymentMethod: boolean
	webhookSecret: string
	autoCapture: boolean
	allowRefundOnRefunded?: boolean
}

// Flexible map of custom fields returned by Braintree.
// Values are represented as strings by the API.
export type CustomFields = Record<string, string>

export interface DecodedClientToken {
	version: number
	authorizationFingerprint: string
	configUrl: string
	graphQL: GraphQl
	clientApiUrl: string
	environment: string
	merchantId: string
	assetsUrl: string
	authUrl: string
	venmo: string
	challenges: string[]
	threeDSecureEnabled: boolean
	analytics: Analytics
	paypalEnabled: boolean
	paypal: Paypal
}

export interface GraphQl {
	url: string
	date: string
	features: string[]
}

export interface Analytics {
	url: string
}

export interface Paypal {
	billingAgreementsEnabled: boolean
	environmentNoNetwork: boolean
	unvettedMerchant: boolean
	allowHttp: boolean
	displayName: string
	clientId: string
	baseUrl: string
	assetsUrl: string
	directBaseUrl: string
	environment: string
	braintreeClientId: string
	merchantAccountId: string
	currencyIsoCode: string
}

export interface DecodedClientTokenAuthorization {
	exp: number
	jti: string
	sub: string
	iss: string
	merchant: Merchant
	rights: string[]
	scope: string[]
	options: Options
}

export interface Merchant {
	public_id: string
	verify_card_by_default: boolean
	verify_wallet_by_default: boolean
}

export interface Options {}
