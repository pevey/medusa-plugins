import { query } from '$app/server';
import { requestContext } from './internal/request';
export const getProducts = query(async () => {
    const ctx = requestContext();
    const queryParams = {};
    if (ctx.region_id)
        queryParams.region_id = ctx.region_id;
    if (ctx.country_code)
        queryParams.country_code = ctx.country_code;
    const { products } = await ctx.client.store.product.list(queryParams, ctx.headers());
    return products;
});
