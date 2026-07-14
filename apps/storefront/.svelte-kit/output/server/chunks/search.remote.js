import "./url.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import "@sveltejs/kit";
import "./shared.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { q as query } from "./query.js";
import { a as object, o as optional, c as number, s as string } from "./index.js";
import { a as requestContext } from "./request.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get search() {
    return search;
  }
}, Symbol.toStringTag, { value: "Module" }));
const search = query(object({ q: string(), limit: optional(number()) }), async ({ q, limit }) => {
  const term = q.trim();
  if (term.length < 2)
    return { hits: [] };
  const ctx = requestContext();
  const res = await ctx.client.store.search.query({ q: term, ...limit ? { limit } : {} }, ctx.headers());
  return { hits: res.hits ?? [] };
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/search.remote.js", "145mkkg");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "145mkkg/" + name;
  fn.__.name = name;
}
export {
  m
};
