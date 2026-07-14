export declare const getProductCategories: import("@sveltejs/kit").RemotePrerenderFunction<void, never[] | import("@medusajs/types").StoreProductCategory[]>;
export declare const getProductCategory: import("@sveltejs/kit").RemotePrerenderFunction<{
    id?: string | undefined;
    slug?: string | undefined;
}, import("@medusajs/types").StoreProductCategory | null>;
export declare const getProductCategoriesQuery: import("@sveltejs/kit").RemoteQueryFunction<void, import("@medusajs/types").StoreProductCategory[]>;
export declare const getProductCategoryQuery: import("@sveltejs/kit").RemoteQueryFunction<{
    id?: string | undefined;
    slug?: string | undefined;
}, import("@medusajs/types").StoreProductCategory | null, {
    id?: string | undefined;
    slug?: string | undefined;
}>;
