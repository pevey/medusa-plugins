import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import "./shared.js";
import "@sveltejs/kit";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { a as object, o as optional, s as string, p as pipe, e as email, n as nonEmpty } from "./index.js";
import { a as requestContext } from "./request.js";
import { g as getConfig } from "./state.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get getCustomer() {
    return getCustomer;
  },
  get updateCustomer() {
    return updateCustomer;
  }
}, Symbol.toStringTag, { value: "Module" }));
function isAuthenticated() {
  return !!getRequestEvent().cookies.get(getConfig().cookies.session);
}
const getCustomer = query(async () => {
  if (!isAuthenticated())
    return null;
  const ctx = requestContext();
  const { customer } = await ctx.client.store.customer.retrieve({}, ctx.headers());
  return customer ?? null;
});
const updateCustomer = command(object({
  first_name: optional(string()),
  last_name: optional(string()),
  email: optional(pipe(string(), nonEmpty(), email())),
  phone: optional(string())
}), async (data) => {
  const ctx = requestContext();
  const { customer } = await ctx.client.store.customer.update(data, {}, ctx.headers());
  return customer;
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/customer.remote.js", "1dq7nwq");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "1dq7nwq/" + name;
  fn.__.name = name;
}
export {
  getCustomer as g,
  m
};
