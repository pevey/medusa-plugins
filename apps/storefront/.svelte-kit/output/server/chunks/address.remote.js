import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import { f as form } from "./form.js";
import "@sveltejs/kit";
import { q as query } from "./query.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { p as pipe, n as nonEmpty, s as string, a as object, o as optional } from "./index.js";
import { a as requestContext } from "./request.js";
import { g as getConfig } from "./state.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get deleteAddress() {
    return deleteAddress;
  },
  get getAddresses() {
    return getAddresses;
  },
  get saveAddress() {
    return saveAddress;
  }
}, Symbol.toStringTag, { value: "Module" }));
function isAuthenticated() {
  return !!getRequestEvent().cookies.get(getConfig().cookies.session);
}
const getAddresses = query(async () => {
  if (!isAuthenticated())
    return [];
  const ctx = requestContext();
  const { addresses } = await ctx.client.store.customer.listAddress({}, ctx.headers());
  return addresses;
});
const saveAddress = form(object({
  id: optional(string()),
  first_name: pipe(string(), nonEmpty()),
  last_name: pipe(string(), nonEmpty()),
  company: optional(string()),
  address_1: pipe(string(), nonEmpty()),
  address_2: optional(string()),
  city: pipe(string(), nonEmpty()),
  province: optional(string()),
  postal_code: pipe(string(), nonEmpty()),
  country_code: pipe(string(), nonEmpty()),
  phone: optional(string())
}), async ({ id, ...address }) => {
  const ctx = requestContext();
  if (id) {
    const { customer: customer2 } = await ctx.client.store.customer.updateAddress(id, address, {}, ctx.headers());
    return { ok: true, customer: customer2 };
  }
  const { customer } = await ctx.client.store.customer.createAddress(address, {}, ctx.headers());
  return { ok: true, customer };
});
const deleteAddress = command(pipe(string(), nonEmpty()), async (addressId) => {
  const ctx = requestContext();
  await ctx.client.store.customer.deleteAddress(addressId, ctx.headers());
  return { ok: true };
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/address.remote.js", "886o7s");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "886o7s/" + name;
  fn.__.name = name;
}
export {
  m
};
