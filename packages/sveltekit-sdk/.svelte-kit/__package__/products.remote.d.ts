export declare const getProducts: import("@sveltejs/kit").RemotePrerenderFunction<{
    region_id?: string | undefined;
    country_code?: string | undefined;
} | undefined, never[] | import("@pevey/medusa-sdk").StoreProduct[]>;
export declare const getProduct: import("@sveltejs/kit").RemotePrerenderFunction<{
    id?: string | undefined;
    slug?: string | undefined;
    region_id?: string | undefined;
    country_code?: string | undefined;
}, import("@pevey/medusa-sdk").StoreProduct | null>;
export declare const getProductsQuery: import("@sveltejs/kit").RemoteQueryFunction<{
    region_id?: string | undefined;
    country_code?: string | undefined;
} | undefined, import("@pevey/medusa-sdk").StoreProduct[], {
    region_id?: string | undefined;
    country_code?: string | undefined;
}>;
export declare const getProductQuery: import("@sveltejs/kit").RemoteQueryFunction<{
    id?: string | undefined;
    slug?: string | undefined;
    region_id?: string | undefined;
    country_code?: string | undefined;
}, import("@pevey/medusa-sdk").StoreProduct | null, {
    id?: string | undefined;
    slug?: string | undefined;
    region_id?: string | undefined;
    country_code?: string | undefined;
}>;
