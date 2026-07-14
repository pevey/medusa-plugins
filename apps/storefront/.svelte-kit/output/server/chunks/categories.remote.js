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
  get getProductCategories() {
    return getProductCategories;
  },
  get getProductCategoriesQuery() {
    return getProductCategoriesQuery;
  },
  get getProductCategory() {
    return getProductCategory;
  },
  get getProductCategoryQuery() {
    return getProductCategoryQuery;
  }
}, Symbol.toStringTag, { value: "Module" }));
const bySlugSchema = object({
  id: optional(string()),
  slug: optional(string())
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
const getProductCategories = prerender(async () => listCategoriesCore(getClient()).catch(() => []), {
  dynamic: true
});
const getProductCategory = prerender(bySlugSchema, async (a) => getCategoryCore(getClient(), a).catch(() => null), { dynamic: true });
const getProductCategoriesQuery = query(async () => {
  const ctx = requestContext();
  return listCategoriesCore(ctx.client, ctx.headers());
});
const getProductCategoryQuery = query(bySlugSchema, async (a) => {
  const ctx = requestContext();
  return getCategoryCore(ctx.client, a, ctx.headers());
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/categories.remote.js", "8zz69k");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "8zz69k/" + name;
  fn.__.name = name;
}
export {
  m
};
