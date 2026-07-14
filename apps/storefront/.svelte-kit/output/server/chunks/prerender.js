import { error, json } from "@sveltejs/kit";
import { B as BROWSER } from "./false.js";
import { get_request_store } from "@sveltejs/kit/internal/server";
import { z as stringify_remote_arg, b as noop, o as stringify } from "./shared.js";
import { b as base, c as app_dir } from "./server.js";
import { a as get_response, p as parse_remote_response, b as run_remote_function, c as create_validator } from "./query.js";
// @__NO_SIDE_EFFECTS__
function prerender(validate_or_fn, fn_or_options, maybe_options) {
  const maybe_fn = typeof fn_or_options === "function" ? fn_or_options : void 0;
  const options = maybe_options ?? (maybe_fn ? void 0 : fn_or_options);
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = {
    type: "prerender",
    id: "",
    name: "",
    has_arg: !!maybe_fn,
    inputs: options?.inputs,
    dynamic: options?.dynamic
  };
  const wrapper = (arg) => {
    const { event, state } = get_request_store();
    const payload = stringify_remote_arg(arg, state.transport);
    const promise = get_response(__, payload, state, async () => {
      const id = __.id;
      const url = `${base}/${app_dir}/remote/${id}${payload ? `/${payload}` : ""}`;
      if (!state.prerendering && !BROWSER && !event.isRemoteRequest) {
        try {
          const response = await fetch(new URL(url, event.url.origin).href);
          if (!response.ok) {
            throw new Error("Prerendered response not found");
          }
          const prerendered = (
            /** @type {RemoteFunctionResponse} */
            await response.json()
          );
          if (prerendered.type === "error") {
            error(prerendered.status, prerendered.error);
          }
          return parse_remote_response(prerendered.data, state.transport)._;
        } catch {
        }
      }
      if (state.prerendering?.remote_responses.has(url)) {
        return (
          /** @type {Promise<any>} */
          state.prerendering.remote_responses.get(url)
        );
      }
      const promise2 = run_remote_function(event, state, false, () => validate(arg), fn);
      if (state.prerendering) {
        state.prerendering.remote_responses.set(url, promise2);
      }
      const result = await promise2;
      if (state.prerendering) {
        const body = { type: "result", data: stringify({ _: result }, state.transport) };
        state.prerendering.dependencies.set(url, {
          body: JSON.stringify(body),
          response: json(body)
        });
      }
      return result;
    });
    promise.catch(noop);
    return (
      /** @type {RemoteResource<Output>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
export {
  prerender as p
};
