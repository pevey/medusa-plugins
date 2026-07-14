import "./url.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import "@sveltejs/kit";
import "./shared.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { a as requestContext } from "./request.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get getProducts() {
    return getProducts;
  }
}, Symbol.toStringTag, { value: "Module" }));
const getProducts = query(async () => {
  const ctx = requestContext();
  const queryParams = {};
  if (ctx.region_id)
    queryParams.region_id = ctx.region_id;
  if (ctx.country_code)
    queryParams.country_code = ctx.country_code;
  const { products } = await ctx.client.store.product.list(queryParams, ctx.headers());
  return products;
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
