export declare const getCustomer: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StoreCustomer | null>;
export declare const updateCustomer: import("@sveltejs/kit").RemoteCommand<{
    first_name?: string | undefined;
    last_name?: string | undefined;
    email?: string | undefined;
    phone?: string | undefined;
}, import("@medusajs/types").StoreCustomer>;
