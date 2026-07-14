/**
 * Generic storefront search (requires the search plugin on the backend). Returns
 * the raw hits; consumers cast to their own hit type.
 */
export declare const search: import("@sveltejs/kit").RemoteQueryFunction<{
    q: string;
    limit?: number | undefined;
}, {
    hits: import("@pevey/medusa-sdk").StoreSearchHit[];
}, {
    q: string;
    limit?: number | undefined;
}>;
