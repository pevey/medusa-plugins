export declare const listPaymentProviders: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StorePaymentProviderListResponse>;
export declare const initiatePaymentSession: import("@sveltejs/kit").RemoteCommand<{
    provider_id: string;
}, import("@medusajs/types").StorePaymentCollectionResponse | null>;
