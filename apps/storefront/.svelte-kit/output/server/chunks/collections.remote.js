import "./url.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import "@sveltejs/kit";
import "./shared.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { p as prerender } from "./prerender.js";
import { q as query } from "./query.js";
import { a as object, o as optional, s as string } from "./index.js";
import { a as getClient } from "./state.js";
import { a as requestContext } from "./request.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get getCollection() {
    return getCollection;
  },
  get getCollectionQuery() {
    return getCollectionQuery;
  },
  get getCollections() {
    return getCollections;
  },
  get getCollectionsQuery() {
    return getCollectionsQuery;
  }
}, Symbol.toStringTag, { value: "Module" }));
const bySlugSchema = object({
  id: optional(string()),
  slug: optional(string())
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
const getCollections = prerender(async () => listCollectionsCore(getClient()).catch(() => []), {
  dynamic: true
});
const getCollection = prerender(bySlugSchema, async (a) => getCollectionCore(getClient(), a).catch(() => null), { dynamic: true });
const getCollectionsQuery = query(async () => {
  const ctx = requestContext();
  return listCollectionsCore(ctx.client, ctx.headers());
});
const getCollectionQuery = query(bySlugSchema, async (a) => {
  const ctx = requestContext();
  return getCollectionCore(ctx.client, a, ctx.headers());
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/collections.remote.js", "1hg7f4b");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "1hg7f4b/" + name;
  fn.__.name = name;
}
export {
  m
};
