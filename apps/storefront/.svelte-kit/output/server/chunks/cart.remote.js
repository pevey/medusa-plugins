import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import "./shared.js";
import "@sveltejs/kit";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { o as optional, s as string, a as object, p as pipe, m as minValue, c as number, n as nonEmpty, r as record, u as unknown, e as email } from "./index.js";
import { a as requestContext } from "./request.js";
import { g as getConfig } from "./state.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get addToCart() {
    return addToCart;
  },
  get completeCart() {
    return completeCart;
  },
  get createCart() {
    return createCart;
  },
  get getCart() {
    return getCart;
  },
  get getCartById() {
    return getCartById;
  },
  get getShippingOptions() {
    return getShippingOptions;
  },
  get removeFromCart() {
    return removeFromCart;
  },
  get selectShippingOption() {
    return selectShippingOption;
  },
  get updateCart() {
    return updateCart;
  },
  get updateCartItem() {
    return updateCartItem;
  }
}, Symbol.toStringTag, { value: "Module" }));
const cartRelations = { fields: "+shipping_methods.name" };
const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 400;
function cartCookieName() {
  return getConfig().cookies.cart;
}
function setCartCookie(id) {
  getRequestEvent().cookies.set(cartCookieName(), id, {
    path: "/",
    maxAge: CART_COOKIE_MAX_AGE,
    sameSite: "strict",
    httpOnly: true,
    secure: true
  });
}
function currentCartId() {
  return getRequestEvent().cookies.get(cartCookieName());
}
const addressSchema = object({
  first_name: optional(string()),
  last_name: optional(string()),
  address_1: optional(string()),
  address_2: optional(string()),
  city: optional(string()),
  province: optional(string()),
  country_code: optional(string()),
  postal_code: optional(string()),
  phone: optional(string()),
  company: optional(string())
});
const getCart = query(async () => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.retrieve(cartId, cartRelations, ctx.headers());
  return cart;
});
const getCartById = query(optional(string()), async (cartId) => {
  if (!cartId)
    return null;
  const ctx = requestContext();
  const { cart } = await ctx.client.store.cart.retrieve(cartId, cartRelations, ctx.headers());
  if (cart)
    setCartCookie(cart.id);
  return cart ?? null;
});
const createCart = command(async () => {
  const ctx = requestContext();
  const { cart } = await ctx.client.store.cart.create(ctx.region_id ? { region_id: ctx.region_id } : {}, cartRelations, ctx.headers());
  setCartCookie(cart.id);
  getCart().set(cart);
  return cart;
});
async function ensureCartId(ctx) {
  const existing = currentCartId();
  if (existing)
    return existing;
  const { cart } = await ctx.client.store.cart.create(ctx.region_id ? { region_id: ctx.region_id } : {}, cartRelations, ctx.headers());
  setCartCookie(cart.id);
  return cart.id;
}
const addToCart = command(object({
  variant_id: pipe(string(), nonEmpty()),
  quantity: optional(pipe(number(), minValue(1)), 1)
}), async ({ variant_id, quantity }) => {
  const ctx = requestContext();
  const cartId = await ensureCartId(ctx);
  const { cart } = await ctx.client.store.cart.createLineItem(cartId, { variant_id, quantity }, cartRelations, ctx.headers());
  getCart().set(cart);
  return cart;
});
const removeFromCart = command(string(), async (lineId) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { parent } = await ctx.client.store.cart.deleteLineItem(cartId, lineId, cartRelations, ctx.headers());
  if (parent)
    getCart().set(parent);
  return parent ?? null;
});
const updateCartItem = command(object({
  item_id: pipe(string(), nonEmpty()),
  quantity: pipe(number(), minValue(0))
}), async ({ item_id, quantity }) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.updateLineItem(cartId, item_id, { quantity }, cartRelations, ctx.headers());
  getCart().set(cart);
  return cart;
});
const updateCart = command(object({
  email: optional(pipe(string(), nonEmpty(), email())),
  region_id: optional(string()),
  shipping_address_id: optional(string()),
  shipping_address: optional(addressSchema),
  billing_address_id: optional(string()),
  billing_address: optional(addressSchema),
  metadata: optional(record(string(), unknown()))
}), async (data) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.update(cartId, data, cartRelations, ctx.headers());
  getCart().set(cart);
  return cart;
});
const selectShippingOption = command(string(), async (optionId) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.addShippingMethod(cartId, { option_id: optionId }, cartRelations, ctx.headers());
  getCart().set(cart);
  return cart;
});
const getShippingOptions = query(async () => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return [];
  const { shipping_options } = await ctx.client.store.fulfillment.listCartOptions({ cart_id: cartId }, ctx.headers());
  return shipping_options;
});
const completeCart = command(async () => {
  const ctx = requestContext();
  const { cookies } = getRequestEvent();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const result = await ctx.client.store.cart.complete(cartId, {}, ctx.headers());
  if (result.type === "order") {
    cookies.delete(cartCookieName(), { path: "/" });
    return result.order;
  }
  return result.cart;
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
