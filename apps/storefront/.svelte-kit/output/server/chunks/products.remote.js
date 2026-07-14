import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import "@sveltejs/kit";
import "./shared.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { g as getConfig, a as getClient } from "./state.js";
import "cookie";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get getProducts() {
    return getProducts;
  }
}, Symbol.toStringTag, { value: "Module" }));
function buildSessionHeader(sessionValue, backendSessionCookie) {
  if (!sessionValue)
    return {};
  return { Cookie: `${backendSessionCookie}=${sessionValue}` };
}
function resolveContext(client, config, cookies) {
  const region_id = cookies.get(config.cookies.region) || config.defaultRegionId || "";
  const country_code = cookies.get(config.cookies.country) || config.defaultCountryCode || "";
  const sessionValue = cookies.get(config.cookies.session);
  return {
    client,
    region_id,
    country_code,
    headers: () => buildSessionHeader(sessionValue, config.backendSessionCookie)
  };
}
function requestContext() {
  const { cookies } = getRequestEvent();
  return resolveContext(getClient(), getConfig(), cookies);
}
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
  m,
  resolveContext as r
};
