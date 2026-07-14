import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import { f as form } from "./form.js";
import "@sveltejs/kit";
import "./query.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { a as object, o as optional, s as string, b as boolean, p as pipe, n as nonEmpty, e as email } from "./index.js";
import { a as requestContext } from "./request.js";
import { g as getConfig } from "./state.js";
import { g as getCart } from "./cart.remote.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get braintreeCheckoutForm() {
    return braintreeCheckoutForm;
  },
  get initiateBraintreePaymentSession() {
    return initiateBraintreePaymentSession;
  }
}, Symbol.toStringTag, { value: "Module" }));
const braintreeCheckoutSchema = object({
  email: pipe(string(), nonEmpty("Email is required"), email("Invalid email address")),
  first_name: pipe(string(), nonEmpty("First name is required")),
  last_name: pipe(string(), nonEmpty("Last name is required")),
  address_1: pipe(string(), nonEmpty("Address is required")),
  address_2: optional(string()),
  city: pipe(string(), nonEmpty("City is required")),
  province: pipe(string(), nonEmpty("Province is required")),
  country_code: pipe(string(), nonEmpty("Country is required")),
  postal_code: pipe(string(), nonEmpty("Postal code is required")),
  phone: optional(string()),
  billing_first_name: optional(string()),
  billing_last_name: optional(string()),
  billing_address_1: optional(string()),
  billing_address_2: optional(string()),
  billing_city: optional(string()),
  billing_province: optional(string()),
  billing_country_code: optional(string()),
  billing_postal_code: optional(string()),
  billing_phone: optional(string()),
  hideBilling: optional(boolean(), true),
  extra: optional(string())
});
function formatBraintreeAddress(type, cart) {
  if (!cart)
    return {};
  const s = cart.shipping_address;
  if (type === "shipping") {
    return {
      firstName: s?.first_name || "",
      lastName: s?.last_name || "",
      streetAddress: s?.address_1 || "",
      extendedAddress: s?.address_2 || "",
      locality: s?.city || "",
      region: s?.province || "",
      postalCode: s?.postal_code || "",
      countryCodeAlpha2: s?.country_code?.toUpperCase() || ""
    };
  }
  const b = cart.billing_address;
  return {
    firstName: b?.first_name || s?.first_name || "",
    lastName: b?.last_name || s?.last_name || "",
    streetAddress: b?.address_1 || s?.address_1 || "",
    extendedAddress: b?.address_2 || "",
    locality: b?.city || s?.city || "",
    region: b?.province || s?.province || "",
    postalCode: b?.postal_code || s?.postal_code || "",
    countryCodeAlpha2: (b?.country_code || s?.country_code)?.toUpperCase() || ""
  };
}
const cartRelations = { fields: "+shipping_methods.name" };
function currentCartId() {
  return getRequestEvent().cookies.get(getConfig().cookies.cart);
}
function backendHeaders(session) {
  const cfg = getConfig();
  return {
    "Content-Type": "application/json",
    "x-publishable-api-key": cfg.publishableKey,
    ...cfg.globalHeaders,
    ...session
  };
}
const braintreeCheckoutForm = form(braintreeCheckoutSchema, async (data) => {
  const ctx = requestContext();
  const cartId = currentCartId();
  if (!cartId)
    return { ok: false, code: "no_cart" };
  const shipping_address = {
    first_name: data.first_name,
    last_name: data.last_name,
    address_1: data.address_1,
    address_2: data.address_2,
    city: data.city,
    province: data.province,
    country_code: data.country_code,
    postal_code: data.postal_code,
    phone: data.phone
  };
  const billing_address = data.hideBilling ? shipping_address : {
    first_name: data.billing_first_name,
    last_name: data.billing_last_name,
    address_1: data.billing_address_1,
    address_2: data.billing_address_2,
    city: data.billing_city,
    province: data.billing_province,
    country_code: data.billing_country_code,
    postal_code: data.billing_postal_code,
    phone: data.billing_phone
  };
  const { cart } = await ctx.client.store.cart.update(cartId, { email: data.email, shipping_address, billing_address }, cartRelations, ctx.headers());
  getCart().set(cart);
  return { ok: true };
});
const initiateBraintreePaymentSession = command(object({
  provider_id: pipe(string(), nonEmpty()),
  data: optional(object({
    payment_method_nonce: optional(string()),
    deviceData: optional(string())
  }))
}), async ({ provider_id, data }) => {
  const ctx = requestContext();
  const cfg = getConfig();
  const cartId = currentCartId();
  if (!cartId)
    return null;
  const { cart } = await ctx.client.store.cart.retrieve(cartId, {}, ctx.headers());
  if (!cart)
    return null;
  if (data?.payment_method_nonce) {
    const res = await fetch(`${cfg.baseUrl}/store/payment-collections/${cart.payment_collection?.id}/payment-sessions`, {
      method: "POST",
      headers: backendHeaders(ctx.headers()),
      body: JSON.stringify({
        provider_id,
        data: {
          payment_method_nonce: data.payment_method_nonce,
          context: {
            customer: {
              email: cart.email,
              firstName: cart.billing_address?.first_name || cart.shipping_address?.first_name || "",
              lastName: cart.billing_address?.last_name || cart.shipping_address?.last_name || "",
              phone: cart.billing_address?.phone || cart.shipping_address?.phone || ""
            },
            shipping: formatBraintreeAddress("shipping", cart),
            billing: formatBraintreeAddress("billing", cart),
            deviceData: data.deviceData
          }
        }
      })
    });
    return res.json();
  }
  return ctx.client.store.payment.initiatePaymentSession(cart, { provider_id }, {}, ctx.headers());
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/braintree.remote.js", "12v7dmm");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "12v7dmm/" + name;
  fn.__.name = name;
}
export {
  m
};
