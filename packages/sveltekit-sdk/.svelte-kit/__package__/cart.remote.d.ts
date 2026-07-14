export declare const getCart: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StoreCart | null>;
export declare const getCartById: import("@sveltejs/kit").RemoteQueryFunction<string | undefined, import("@medusajs/types").StoreCart | null, string | undefined>;
export declare const createCart: import("@sveltejs/kit").RemoteCommand<void, import("@medusajs/types").StoreCart>;
export declare const addToCart: import("@sveltejs/kit").RemoteCommand<{
    variant_id: string;
    quantity?: number | undefined;
}, import("@medusajs/types").StoreCart>;
export declare const removeFromCart: import("@sveltejs/kit").RemoteCommand<string, import("@medusajs/types").StoreCart | null>;
export declare const updateCartItem: import("@sveltejs/kit").RemoteCommand<{
    item_id: string;
    quantity: number;
}, import("@medusajs/types").StoreCart | null>;
export declare const updateCart: import("@sveltejs/kit").RemoteCommand<{
    email?: string | undefined;
    region_id?: string | undefined;
    shipping_address_id?: string | undefined;
    shipping_address?: {
        first_name?: string | undefined;
        last_name?: string | undefined;
        address_1?: string | undefined;
        address_2?: string | undefined;
        city?: string | undefined;
        province?: string | undefined;
        country_code?: string | undefined;
        postal_code?: string | undefined;
        phone?: string | undefined;
        company?: string | undefined;
    } | undefined;
    billing_address_id?: string | undefined;
    billing_address?: {
        first_name?: string | undefined;
        last_name?: string | undefined;
        address_1?: string | undefined;
        address_2?: string | undefined;
        city?: string | undefined;
        province?: string | undefined;
        country_code?: string | undefined;
        postal_code?: string | undefined;
        phone?: string | undefined;
        company?: string | undefined;
    } | undefined;
    metadata?: {
        [x: string]: unknown;
    } | undefined;
}, import("@medusajs/types").StoreCart | null>;
export declare const selectShippingOption: import("@sveltejs/kit").RemoteCommand<string, import("@medusajs/types").StoreCart | null>;
export declare const getShippingOptions: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StoreCartShippingOptionWithServiceZone[]>;
export declare const completeCart: import("@sveltejs/kit").RemoteCommand<void, import("@medusajs/types").StoreCart | import("@medusajs/types").StoreOrder | null>;
