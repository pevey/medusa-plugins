import { prerender, query } from '$app/server';
import * as v from 'valibot';
import { getClient } from './internal/state';
import { requestContext } from './internal/request';
const bySlugSchema = v.object({
    id: v.optional(v.string()),
    slug: v.optional(v.string())
});
async function listCollectionsCore(client, headers) {
    const { collections } = await client.store.collection.list({}, headers);
    return collections;
}
async function getCollectionCore(client, a, headers) {
    if (!a.id && !a.slug)
        return null;
    if (a.id) {
        const { collection } = await client.store.collection.retrieve(a.id, {}, headers);
        return collection;
    }
    const { collections } = await client.store.collection.list({ handle: a.slug }, headers);
    return collections.length ? collections[0] : null;
}
export const getCollections = prerender(async () => listCollectionsCore(getClient()).catch(() => []), {
    dynamic: true
});
export const getCollection = prerender(bySlugSchema, async (a) => getCollectionCore(getClient(), a).catch(() => null), { dynamic: true });
export const getCollectionsQuery = query(async () => {
    const ctx = requestContext();
    return listCollectionsCore(ctx.client, ctx.headers());
});
export const getCollectionQuery = query(bySlugSchema, async (a) => {
    const ctx = requestContext();
    return getCollectionCore(ctx.client, a, ctx.headers());
});
