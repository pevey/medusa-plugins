import "./url.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import "@sveltejs/kit";
import "./shared.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { p as prerender } from "./prerender.js";
import { q as query } from "./query.js";
import { o as optional, a as object, s as string } from "./index.js";
import { a as getClient } from "./state.js";
import { a as requestContext } from "./request.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get getProduct() {
    return getProduct;
  },
  get getProductQuery() {
    return getProductQuery;
  },
  get getProducts() {
    return getProducts;
  },
  get getProductsQuery() {
    return getProductsQuery;
  }
}, Symbol.toStringTag, { value: "Module" }));
const regionSchema = object({
  region_id: optional(string()),
  country_code: optional(string())
});
const productArgsSchema = object({
  id: optional(string()),
  slug: optional(string()),
  region_id: optional(string()),
  country_code: optional(string())
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
  const params = { ...regionParams(a), fields: "*variants.calculated_price" };
  if (a.id) {
    const { product } = await client.store.product.retrieve(a.id, params, headers);
    return product;
  }
  const { products } = await client.store.product.list({ handle: a.slug, ...params }, headers);
  return products.length ? products[0] : null;
}
const getProducts = prerender(optional(regionSchema, {}), async (a) => listProductsCore(getClient(), a).catch(() => []), { dynamic: true });
const getProduct = prerender(productArgsSchema, async (a) => getProductCore(getClient(), a).catch(() => null), { dynamic: true });
const getProductsQuery = query(optional(regionSchema, {}), async (a) => {
  const ctx = requestContext();
  return listProductsCore(ctx.client, { region_id: a.region_id || ctx.region_id, country_code: a.country_code || ctx.country_code }, ctx.headers());
});
const getProductQuery = query(productArgsSchema, async (a) => {
  const ctx = requestContext();
  return getProductCore(ctx.client, { ...a, region_id: a.region_id || ctx.region_id, country_code: a.country_code || ctx.country_code }, ctx.headers());
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/products.remote.js", "1gtf39y");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "1gtf39y/" + name;
  fn.__.name = name;
}
export {
  getProducts as g,
  m
};
