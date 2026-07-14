export declare const getAddresses: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StoreCustomerAddress[]>;
export declare const saveAddress: import("@sveltejs/kit").RemoteForm<{
    id?: string | undefined;
    first_name: string;
    last_name: string;
    company?: string | undefined;
    address_1: string;
    address_2?: string | undefined;
    city: string;
    province?: string | undefined;
    postal_code: string;
    country_code: string;
    phone?: string | undefined;
}, {
    ok: true;
    customer: import("@medusajs/types").StoreCustomer;
}>;
export declare const deleteAddress: import("@sveltejs/kit").RemoteCommand<string, {
    ok: true;
}>;
