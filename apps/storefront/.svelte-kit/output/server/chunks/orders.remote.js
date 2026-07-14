import "./url.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import "@sveltejs/kit";
import "./shared.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { p as pipe, n as nonEmpty, s as string } from "./index.js";
import { a as requestContext } from "./request.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get getOrderById() {
    return getOrderById;
  },
  get getOrders() {
    return getOrders;
  }
}, Symbol.toStringTag, { value: "Module" }));
const getOrders = query(async () => {
  const ctx = requestContext();
  const { orders } = await ctx.client.store.order.list({}, ctx.headers());
  return orders;
});
const getOrderById = query(pipe(string(), nonEmpty()), async (id) => {
  const ctx = requestContext();
  const { order } = await ctx.client.store.order.retrieve(id, {}, ctx.headers());
  return order ?? null;
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/orders.remote.js", "1q1ur2r");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "1q1ur2r/" + name;
  fn.__.name = name;
}
export {
  m
};
