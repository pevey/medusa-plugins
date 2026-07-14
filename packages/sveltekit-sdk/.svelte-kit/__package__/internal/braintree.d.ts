import type { StoreCart } from '@medusajs/types';
/**
 * Map a cart's shipping/billing address to Braintree's address shape.
 * Billing falls back to shipping when a billing field is empty.
 */
export declare function formatBraintreeAddress(type: 'billing' | 'shipping', cart: StoreCart | null): {
    firstName?: undefined;
    lastName?: undefined;
    streetAddress?: undefined;
    extendedAddress?: undefined;
    locality?: undefined;
    region?: undefined;
    postalCode?: undefined;
    countryCodeAlpha2?: undefined;
} | {
    firstName: string;
    lastName: string;
    streetAddress: string;
    extendedAddress: string;
    locality: string;
    region: string;
    postalCode: string;
    countryCodeAlpha2: string;
};
