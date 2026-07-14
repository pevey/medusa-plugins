import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import "./shared.js";
import "@sveltejs/kit";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { o as object, a as optional, s as string, p as pipe, m as minValue, n as number } from "./index.js";
import { a as requestContext } from "./request.js";
import { g as getConfig } from "./state.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get addToCart() {
    return addToCart;
  },
  get getCart() {
    return getCart;
  }
}, Symbol.toStringTag, { value: "Module" }));
const getCart = query(async () => {
  const ctx = requestContext();
  const { cookies } = getRequestEvent();
  const cartId = cookies.get(getConfig().cookies.cart);
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.retrieve(cartId, {}, ctx.headers());
  return cart;
});
const addToCart = command(object({
  variant_id: string(),
  quantity: optional(pipe(number(), minValue(1)), 1)
}), async ({ variant_id, quantity }) => {
  const ctx = requestContext();
  const { cookies } = getRequestEvent();
  const cfg = getConfig();
  let cartId = cookies.get(cfg.cookies.cart);
  if (!cartId) {
    const { cart: cart2 } = await ctx.client.store.cart.create(ctx.region_id ? { region_id: ctx.region_id } : {}, {}, ctx.headers());
    cartId = cart2.id;
    cookies.set(cfg.cookies.cart, cartId, {
      path: "/",
      httpOnly: true,
      secure: true,
      sameSite: "strict",
      maxAge: 60 * 60 * 24 * 30
    });
  }
  const { cart } = await ctx.client.store.cart.createLineItem(cartId, { variant_id, quantity }, {}, ctx.headers());
  await getCart().refresh();
  return cart;
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/cart.remote.js", "1mvazxm");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "1mvazxm/" + name;
  fn.__.name = name;
}
export {
  getCart as g,
  m
};
