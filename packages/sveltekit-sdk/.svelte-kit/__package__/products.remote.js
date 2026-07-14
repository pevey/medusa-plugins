import { prerender, query } from '$app/server';
import * as v from 'valibot';
import { getClient } from './internal/state';
import { requestContext } from './internal/request';
const regionSchema = v.object({
    region_id: v.optional(v.string()),
    country_code: v.optional(v.string())
});
const productArgsSchema = v.object({
    id: v.optional(v.string()),
    slug: v.optional(v.string()),
    region_id: v.optional(v.string()),
    country_code: v.optional(v.string())
});
function regionParams(a) {
    const p = {};
    if (a.region_id)
        p.region_id = a.region_id;
    if (a.country_code)
        p.country_code = a.country_code;
    return p;
}
async function listProductsCore(client, a, headers) {
    const { products } = await client.store.product.list(regionParams(a), headers);
    return products;
}
async function getProductCore(client, a, headers) {
    if (!a.id && !a.slug)
        return null;
    const params = { ...regionParams(a), fields: '*variants.calculated_price' };
    if (a.id) {
        const { product } = await client.store.product.retrieve(a.id, params, headers);
        return product;
    }
    const { products } = await client.store.product.list({ handle: a.slug, ...params }, headers);
    return products.length ? products[0] : null;
}
// Prerender (cacheable, request-independent — region/country via args). Swallow to empty.
export const getProducts = prerender(v.optional(regionSchema, {}), async (a) => listProductsCore(getClient(), a).catch(() => []), { dynamic: true });
export const getProduct = prerender(productArgsSchema, async (a) => getProductCore(getClient(), a).catch(() => null), { dynamic: true });
// Query twins (fresh, personalized — region/country from cookies). Propagate errors.
export const getProductsQuery = query(v.optional(regionSchema, {}), async (a) => {
    const ctx = requestContext();
    return listProductsCore(ctx.client, { region_id: a.region_id || ctx.region_id, country_code: a.country_code || ctx.country_code }, ctx.headers());
});
export const getProductQuery = query(productArgsSchema, async (a) => {
    const ctx = requestContext();
    return getProductCore(ctx.client, { ...a, region_id: a.region_id || ctx.region_id, country_code: a.country_code || ctx.country_code }, ctx.headers());
});
