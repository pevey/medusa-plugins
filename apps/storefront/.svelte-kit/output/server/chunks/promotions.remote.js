import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import "./shared.js";
import "@sveltejs/kit";
import { init_remote_functions } from "@sveltejs/kit/internal";
import "./query.js";
import { p as pipe, n as nonEmpty, s as string } from "./index.js";
import { a as requestContext } from "./request.js";
import { g as getConfig } from "./state.js";
import { g as getCart } from "./cart.remote.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get addPromotion() {
    return addPromotion;
  },
  get removePromotion() {
    return removePromotion;
  }
}, Symbol.toStringTag, { value: "Module" }));
const cartRelations = { fields: "+shipping_methods.name" };
function currentCartId() {
  return getRequestEvent().cookies.get(getConfig().cookies.cart);
}
const addPromotion = command(pipe(string(), nonEmpty()), async (code) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.addPromotions(cartId, { promo_codes: [code] }, cartRelations, ctx.headers());
  getCart().set(cart);
  return cart;
});
const removePromotion = command(pipe(string(), nonEmpty()), async (code) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.removePromotions(cartId, { promo_codes: [code] }, cartRelations, ctx.headers());
  getCart().set(cart);
  return cart;
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/promotions.remote.js", "l391ke");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "l391ke/" + name;
  fn.__.name = name;
}
export {
  m
};
