import { get_request_store } from "@sveltejs/kit/internal/server";
import { c as create_validator, b as run_remote_function } from "./query.js";
import { M as MUTATIVE_METHODS } from "./shared.js";
// @__NO_SIDE_EFFECTS__
function command(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = { type: "command", id: "", name: "" };
  const wrapper = (arg) => {
    const { event, state } = get_request_store();
    if (!MUTATIVE_METHODS.includes(event.request.method)) {
      throw new Error(
        `Cannot call a command (\`${__.name}(${maybe_fn ? "..." : ""})\`) from a ${event.request.method} handler`
      );
    }
    if (state.is_in_render) {
      throw new Error(
        `Cannot call a command (\`${__.name}(${maybe_fn ? "..." : ""})\`) during server-side rendering`
      );
    }
    const promise = Promise.resolve(
      run_remote_function(event, state, true, () => validate(arg), fn)
    );
    promise.updates = () => {
      throw new Error(`Cannot call '${__.name}(...).updates(...)' on the server`);
    };
    return (
      /** @type {ReturnType<RemoteCommand<Input, Output>>} */
      promise
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  Object.defineProperty(wrapper, "pending", {
    get: () => 0
  });
  return wrapper;
}
export {
  command as c
};
