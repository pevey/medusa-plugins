export declare const getCollections: import("@sveltejs/kit").RemotePrerenderFunction<void, never[] | import("@medusajs/types").StoreCollection[]>;
export declare const getCollection: import("@sveltejs/kit").RemotePrerenderFunction<{
    id?: string | undefined;
    slug?: string | undefined;
}, import("@medusajs/types").StoreCollection | null>;
export declare const getCollectionsQuery: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StoreCollection[]>;
export declare const getCollectionQuery: import("@sveltejs/kit").RemoteQueryFunction<{
    id?: string | undefined;
    slug?: string | undefined;
}, import("@medusajs/types").StoreCollection | null, {
    id?: string | undefined;
    slug?: string | undefined;
}>;
