import { c } from "./chunks/command.js";
import { f } from "./chunks/form.js";
import { p } from "./chunks/prerender.js";
import { g as get_cache, r as refresh } from "./chunks/query.js";
import { q } from "./chunks/query.js";
import { HttpError } from "@sveltejs/kit/internal";
import { get_request_store } from "@sveltejs/kit/internal/server";
import { b as noop, p as parse_remote_arg } from "./chunks/shared.js";
function requested(query, limit) {
  const { event, state } = get_request_store();
  const internals = (
    /** @type {RemoteAnyQueryInternals | undefined} */
    /** @type {any} */
    query.__
  );
  if (internals?.type !== "query" && internals?.type !== "query_batch" && internals?.type !== "query_live") {
    throw new Error(
      "requested(...) expects a query function created with query(...), query.batch(...), or query.live(...)"
    );
  }
  const __ = internals;
  const requested2 = state.remote.requested;
  const payloads = requested2?.get(__.id) ?? [];
  if (!state.is_in_remote_form_or_command) {
    throw new Error(
      "requested(...) can only be called in the context of a command/form remote function"
    );
  }
  const [selected, skipped] = split_limit(payloads, limit);
  const record_failure = (payload, error) => {
    const promise = Promise.reject(error);
    promise.catch(noop);
    get_cache(__, state)[payload] = promise;
    refresh(event, state, __, payload, () => promise);
  };
  for (const payload of skipped) {
    record_failure(
      payload,
      new HttpError(
        400,
        `Requested refresh was rejected because it exceeded requested(${__.name}, ${limit}) limit`
      )
    );
  }
  const result = {
    *[Symbol.iterator]() {
      for (const payload of selected) {
        try {
          const parsed = parse_remote_arg(payload, state.transport);
          const validated = __.validate(parsed);
          if (is_thenable(validated)) {
            throw new Error(
              // TODO improve
              `requested(${__.name}, ${limit}) cannot be used with synchronous iteration because the query validator is async. Use \`for await ... of\` instead`
            );
          }
          yield { arg: validated, query: __.bind(payload, validated) };
        } catch (error) {
          record_failure(payload, error);
          continue;
        }
      }
    },
    async *[Symbol.asyncIterator]() {
      yield* race_all(selected, async (payload) => {
        try {
          const parsed = parse_remote_arg(payload, state.transport);
          const validated = await __.validate(parsed);
          return { arg: validated, query: __.bind(payload, validated) };
        } catch (error) {
          record_failure(payload, error);
          throw new Error(`Skipping ${__.name}(${payload})`, { cause: error });
        }
      });
    },
    async refreshAll() {
      if (__.type === "query_live") {
        throw new Error("refreshAll() is invalid for live queries. Use reconnectAll() instead.");
      }
      for await (const { query: query2 } of result) {
        void /** @type {RemoteQuery<Output>} */
        query2.refresh();
      }
    },
    async reconnectAll() {
      if (__.type !== "query_live") {
        throw new Error("reconnectAll() is invalid for regular queries. Use refreshAll() instead.");
      }
      for await (const { query: query2 } of result) {
        void /** @type {RemoteLiveQuery<Output>} */
        query2.reconnect();
      }
    }
  };
  return (
    /** @type {RequestedResult<Validated, Output>} */
    /** @type {unknown} */
    result
  );
}
function split_limit(array, limit) {
  if (limit === Infinity) {
    return [array, []];
  }
  if (!Number.isInteger(limit) || limit < 0) {
    throw new Error("Limit must be a non-negative integer or Infinity");
  }
  return [array.slice(0, limit), array.slice(limit)];
}
function is_thenable(value) {
  return !!value && (typeof value === "object" || typeof value === "function") && "then" in value;
}
async function* race_all(array, fn) {
  const pending = /* @__PURE__ */ new Set();
  for (const value of array) {
    const promise = Promise.resolve(fn(value)).then((result) => ({
      promise,
      value: result
    }));
    promise.catch(() => pending.delete(promise));
    pending.add(promise);
  }
  while (pending.size > 0) {
    try {
      const { promise, value } = await Promise.race(pending);
      pending.delete(promise);
      yield value;
    } catch {
    }
  }
}
export {
  c as command,
  f as form,
  p as prerender,
  q as query,
  requested
};
