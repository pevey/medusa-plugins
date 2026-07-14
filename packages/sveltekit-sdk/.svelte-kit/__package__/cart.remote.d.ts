export declare const getCart: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StoreCart | null>;
export declare const addToCart: import("@sveltejs/kit").RemoteCommand<{
    variant_id: string;
    quantity?: number | undefined;
}, import("@medusajs/types").StoreCart>;
