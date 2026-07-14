import { prerender, query } from '$app/server';
import * as v from 'valibot';
import { getClient } from './internal/state';
import { requestContext } from './internal/request';
const bySlugSchema = v.object({
    id: v.optional(v.string()),
    slug: v.optional(v.string())
});
async function listCategoriesCore(client, headers) {
    const { product_categories } = await client.store.category.list({}, headers);
    return product_categories;
}
async function getCategoryCore(client, a, headers) {
    if (!a.id && !a.slug)
        return null;
    if (a.id) {
        const { product_category } = await client.store.category.retrieve(a.id, {}, headers);
        return product_category;
    }
    const { product_categories } = await client.store.category.list({ handle: a.slug }, headers);
    return product_categories.length ? product_categories[0] : null;
}
export const getProductCategories = prerender(async () => listCategoriesCore(getClient()).catch(() => []), {
    dynamic: true
});
export const getProductCategory = prerender(bySlugSchema, async (a) => getCategoryCore(getClient(), a).catch(() => null), { dynamic: true });
export const getProductCategoriesQuery = query(async () => {
    const ctx = requestContext();
    return listCategoriesCore(ctx.client, ctx.headers());
});
export const getProductCategoryQuery = query(bySlugSchema, async (a) => {
    const ctx = requestContext();
    return getCategoryCore(ctx.client, a, ctx.headers());
});
