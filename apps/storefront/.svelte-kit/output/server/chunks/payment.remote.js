import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import "./shared.js";
import "@sveltejs/kit";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { a as object, p as pipe, n as nonEmpty, s as string } from "./index.js";
import { a as requestContext } from "./request.js";
import { g as getConfig } from "./state.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get initiatePaymentSession() {
    return initiatePaymentSession;
  },
  get listPaymentProviders() {
    return listPaymentProviders;
  }
}, Symbol.toStringTag, { value: "Module" }));
function currentCartId() {
  return getRequestEvent().cookies.get(getConfig().cookies.cart);
}
const listPaymentProviders = query(async () => {
  const ctx = requestContext();
  return ctx.client.store.payment.listPaymentProviders({ region_id: ctx.region_id }, ctx.headers());
});
const initiatePaymentSession = command(object({ provider_id: pipe(string(), nonEmpty()) }), async ({ provider_id }) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.retrieve(cartId, {}, ctx.headers());
  if (!cart)
    return null;
  return ctx.client.store.payment.initiatePaymentSession(cart, { provider_id }, {}, ctx.headers());
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/payment.remote.js", "1aw3z04");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "1aw3z04/" + name;
  fn.__.name = name;
}
export {
  m
};
