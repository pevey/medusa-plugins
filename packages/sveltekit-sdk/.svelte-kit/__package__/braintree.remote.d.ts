/**
 * Apply checkout details (email + shipping/billing addresses) to the cart.
 * A minimal, ready-to-use checkout form; most stores will build their own.
 */
export declare const braintreeCheckoutForm: import("@sveltejs/kit").RemoteForm<{
    email: string;
    first_name: string;
    last_name: string;
    address_1: string;
    address_2?: string | undefined;
    city: string;
    province: string;
    country_code: string;
    postal_code: string;
    phone?: string | undefined;
    billing_first_name?: string | undefined;
    billing_last_name?: string | undefined;
    billing_address_1?: string | undefined;
    billing_address_2?: string | undefined;
    billing_city?: string | undefined;
    billing_province?: string | undefined;
    billing_country_code?: string | undefined;
    billing_postal_code?: string | undefined;
    billing_phone?: string | undefined;
    hideBilling?: boolean | undefined;
    extra?: string | undefined;
}, {
    ok: false;
    code: string;
} | {
    ok: true;
    code?: undefined;
}>;
/**
 * Initiate a Braintree payment session. When a client-side `payment_method_nonce`
 * (and optional `deviceData`) is supplied, it is sent with a Braintree customer/
 * address context via the payment-collections API; otherwise a plain session is
 * initiated through the SDK.
 */
export declare const initiateBraintreePaymentSession: import("@sveltejs/kit").RemoteCommand<{
    provider_id: string;
    data?: {
        payment_method_nonce?: string | undefined;
        deviceData?: string | undefined;
    } | undefined;
}, any>;
