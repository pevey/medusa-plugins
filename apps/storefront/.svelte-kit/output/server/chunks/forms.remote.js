import "./url.js";
import "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import "./shared.js";
import "@sveltejs/kit";
import { init_remote_functions } from "@sveltejs/kit/internal";
import "./query.js";
import { a as object, o as optional, s as string, r as record, p as pipe, n as nonEmpty, u as unknown } from "./index.js";
import { a as requestContext } from "./request.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get submitForm() {
    return submitForm;
  }
}, Symbol.toStringTag, { value: "Module" }));
const submitForm = command(object({
  handle: pipe(string(), nonEmpty()),
  data: record(string(), unknown()),
  token: optional(string())
}), async ({ handle, data, token }) => {
  const ctx = requestContext();
  return ctx.client.store.form.submit(handle, { token, data }, ctx.headers());
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/forms.remote.js", "swcotn");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "swcotn/" + name;
  fn.__.name = name;
}
export {
  m
};
