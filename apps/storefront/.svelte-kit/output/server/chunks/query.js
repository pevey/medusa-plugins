import { with_request_store, get_request_store } from "@sveltejs/kit/internal/server";
import { z as stringify_remote_arg, k as create_remote_key, b as noop, h as handle_error_and_jsonify } from "./shared.js";
import { p as prerendering } from "./internal2.js";
import { parse } from "devalue";
import { error } from "@sveltejs/kit";
import { HttpError, SvelteKitError } from "@sveltejs/kit/internal";
function create_validator(validate_or_fn, maybe_fn) {
  if (!maybe_fn) {
    return (arg) => {
      if (arg !== void 0) {
        error(400, "Bad Request");
      }
    };
  }
  if (validate_or_fn === "unchecked") {
    return (arg) => arg;
  }
  if ("~standard" in validate_or_fn) {
    return async (arg) => {
      const { event, state } = get_request_store();
      const result = await validate_or_fn["~standard"].validate(arg);
      if (result.issues) {
        error(
          400,
          await state.handleValidationError({
            issues: result.issues,
            event
          })
        );
      }
      return result.value;
    };
  }
  throw new Error(
    'Invalid validator passed to remote function. Expected "unchecked" or a Standard Schema (https://standardschema.dev)'
  );
}
async function get_response(internals, payload, state, get_result) {
  await 0;
  const cache = get_cache(internals, state);
  if (!state.is_in_remote_query) {
    get_implicit_lookup(internals, state)[payload] = get_result;
  }
  return cache[payload] ??= get_result();
}
function parse_remote_response(data, transport) {
  const revivers = {};
  for (const key in transport) {
    revivers[key] = transport[key].decode;
  }
  return parse(data, revivers);
}
function derive_remote_function_event(event, state, allow_cookies) {
  return {
    event: {
      ...event,
      setHeaders: () => {
        throw new Error("setHeaders is not allowed in remote functions");
      },
      cookies: {
        ...event.cookies,
        set: (name, value, opts) => {
          if (!allow_cookies) {
            throw new Error("Cannot set cookies in `query` or `prerender` functions");
          }
          if (opts.path && !opts.path.startsWith("/")) {
            throw new Error("Cookies set in remote functions must have an absolute path");
          }
          return event.cookies.set(name, value, opts);
        },
        delete: (name, opts) => {
          if (!allow_cookies) {
            throw new Error("Cannot delete cookies in `query` or `prerender` functions");
          }
          if (opts.path && !opts.path.startsWith("/")) {
            throw new Error("Cookies deleted in remote functions must have an absolute path");
          }
          return event.cookies.delete(name, opts);
        }
      }
    },
    state: {
      ...state,
      is_in_remote_function: true
    }
  };
}
async function run_remote_function(event, state, allow_cookies, get_input, fn) {
  const store = derive_remote_function_event(event, state, allow_cookies);
  const input = await with_request_store(store, get_input);
  return with_request_store(store, () => fn(input));
}
async function* run_remote_generator(event, state, allow_cookies, get_input, fn, name) {
  const store = derive_remote_function_event(event, state, allow_cookies);
  const input = await with_request_store(store, get_input);
  const source = await with_request_store(store, () => fn(input));
  const iterator = to_iterator(source, name);
  let done = false;
  try {
    while (true) {
      const result = await with_request_store(store, () => iterator.next());
      if (result.done) {
        done = true;
        return result.value;
      }
      yield result.value;
    }
  } finally {
    if (!done && typeof iterator.return === "function") {
      await with_request_store(store, () => iterator.return?.(void 0));
    }
  }
}
function to_iterator(source, name) {
  if ("next" in source && typeof source.next === "function") {
    return source;
  }
  if (Symbol.asyncIterator in source && typeof source[Symbol.asyncIterator] === "function") {
    return source[Symbol.asyncIterator]();
  }
  if (Symbol.iterator in source && typeof source[Symbol.iterator] === "function") {
    return source[Symbol.iterator]();
  }
  throw new Error(
    `query.live '${name}' must return an Iterator, Iterable, AsyncIterator or AsyncIterable`
  );
}
function get_cache(internals, state) {
  let cache = state.remote.data?.get(internals);
  if (cache === void 0) {
    cache = {};
    (state.remote.data ??= /* @__PURE__ */ new Map()).set(internals, cache);
  }
  return cache;
}
function get_implicit_lookup(internals, state) {
  let cache = state.remote.implicit?.get(internals);
  if (cache === void 0) {
    cache = {};
    (state.remote.implicit ??= /* @__PURE__ */ new Map()).set(internals, cache);
  }
  return cache;
}
class SharedIterator {
  /**
   * @typedef {object} Subscriber
   * @property {{ value: any } | null} pending
   * @property {{ error: unknown } | null} pending_error
   * @property {boolean} finished
   * @property {((result: IteratorResult<any, void>) => void) | null} waiting_resolve
   * @property {((reason: unknown) => void) | null} waiting_reject
   */
  /** @type {Set<Subscriber>} */
  #subscribers = /* @__PURE__ */ new Set();
  /** @type {((instance: SharedIterator<T>) => (() => void)) | undefined} */
  #start = void 0;
  /** @type {(() => void) | undefined} */
  #stop = void 0;
  /** Once `done()` or `fail()` has been broadcast, no new values are accepted. */
  #closed = false;
  /** @type {unknown} */
  #terminal_error = void 0;
  /** Whether `done()` or `fail()` has been broadcast. */
  get closed() {
    return this.#closed;
  }
  /**
   * @param {(instance: SharedIterator<T>) => (() => void)} [start]
   */
  constructor(start) {
    this.#start = start;
  }
  /** @param {T} value */
  push(value) {
    if (this.#closed) return;
    for (const subscriber of this.#subscribers) {
      if (subscriber.waiting_resolve) {
        const resolve = subscriber.waiting_resolve;
        subscriber.waiting_resolve = null;
        subscriber.waiting_reject = null;
        resolve({ value, done: false });
      } else {
        subscriber.pending = { value };
      }
    }
  }
  /**
   * Signal natural completion to all current subscribers, and to any future
   * subscriber (which will receive an immediately-done iterator).
   */
  done() {
    if (this.#closed) return;
    this.#closed = true;
    for (const subscriber of this.#subscribers) {
      subscriber.finished = true;
      if (subscriber.waiting_resolve) {
        const resolve = subscriber.waiting_resolve;
        subscriber.waiting_resolve = null;
        subscriber.waiting_reject = null;
        resolve({ value: void 0, done: true });
      }
    }
    this.#subscribers.clear();
  }
  /**
   * Broadcast a terminal error. All current subscribers will reject their
   * next `.next()` call with `error`. Future subscribers will also reject
   * their first `.next()`.
   *
   * @param {unknown} error
   */
  fail(error2) {
    if (this.#closed) return;
    this.#closed = true;
    this.#terminal_error = error2;
    for (const subscriber of this.#subscribers) {
      subscriber.finished = true;
      if (subscriber.waiting_reject) {
        const reject = subscriber.waiting_reject;
        subscriber.waiting_resolve = null;
        subscriber.waiting_reject = null;
        reject(error2);
      } else {
        subscriber.pending_error = { error: error2 };
      }
    }
    this.#subscribers.clear();
  }
  /**
   * Subscribe to the shared stream. Returns an `AsyncGenerator<T>` that
   * yields every value pushed after this call (and, if `initial_value` is
   * provided, that value as the first yield).
   *
   * @param {{ initial_value?: { value: T } }} [options]
   *   `initial_value` lets the caller seed the iterator with a synchronously-
   *   available current value before any new pushes arrive (e.g. the
   *   "last-seen value" of a reactive resource). Pass it wrapped in an
   *   object so `undefined` can be distinguished from "no initial value".
   * @returns {AsyncGenerator<T, void, void>}
   */
  subscribe(options) {
    const subscriber = {
      pending: options?.initial_value ? { value: options.initial_value.value } : null,
      pending_error: this.#closed && this.#terminal_error !== void 0 ? { error: this.#terminal_error } : null,
      finished: this.#closed && this.#terminal_error === void 0,
      waiting_resolve: null,
      waiting_reject: null
    };
    if (!subscriber.finished && subscriber.pending_error === null) {
      this.#subscribers.add(subscriber);
    }
    if (!this.#closed) {
      this.#stop ??= this.#start?.(this);
    }
    const unsubscribe = () => {
      subscriber.finished = true;
      const was_present = this.#subscribers.delete(subscriber);
      if (was_present && this.#subscribers.size === 0) {
        this.#stop?.();
      }
    };
    const iterator = {
      next() {
        if (subscriber.pending_error) {
          const { error: error2 } = subscriber.pending_error;
          subscriber.pending_error = null;
          unsubscribe();
          return Promise.reject(error2);
        }
        if (subscriber.pending) {
          const { value } = subscriber.pending;
          subscriber.pending = null;
          return Promise.resolve({ value, done: false });
        }
        if (subscriber.finished) {
          return Promise.resolve({ value: void 0, done: true });
        }
        return new Promise((resolve, reject) => {
          subscriber.waiting_resolve = resolve;
          subscriber.waiting_reject = reject;
        });
      },
      return(value) {
        unsubscribe();
        if (subscriber.waiting_resolve) {
          const resolve = subscriber.waiting_resolve;
          subscriber.waiting_resolve = null;
          subscriber.waiting_reject = null;
          resolve({ value: void 0, done: true });
        }
        return Promise.resolve({ value: (
          /** @type {void} */
          value
        ), done: true });
      },
      throw(error2) {
        unsubscribe();
        if (subscriber.waiting_reject) {
          const reject = subscriber.waiting_reject;
          subscriber.waiting_resolve = null;
          subscriber.waiting_reject = null;
          reject(error2);
        }
        return Promise.reject(error2);
      },
      [Symbol.asyncIterator]() {
        return iterator;
      }
    };
    return iterator;
  }
}
// @__NO_SIDE_EFFECTS__
function query(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const __ = {
    type: "query",
    id: "",
    name: "",
    validate,
    bind(payload, validated_arg) {
      const { event, state } = get_request_store();
      return create_query_resource(
        __,
        payload,
        event,
        state,
        () => run_remote_function(
          event,
          { ...state, is_in_remote_query: true },
          false,
          () => validated_arg,
          fn
        )
      );
    }
  };
  const wrapper = (arg) => {
    if (prerendering) {
      throw new Error(
        `Cannot call query '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
      );
    }
    const { event, state } = get_request_store();
    const payload = stringify_remote_arg(arg, state.transport);
    return create_query_resource(
      __,
      payload,
      event,
      state,
      () => run_remote_function(
        event,
        { ...state, is_in_remote_query: true },
        false,
        () => validate(arg),
        fn
      )
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
// @__NO_SIDE_EFFECTS__
function live(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const run = (event, state, get_input) => run_remote_generator(
    event,
    { ...state, is_in_remote_query: true },
    false,
    get_input,
    fn,
    __.name
  );
  const __ = {
    type: "query_live",
    id: "",
    name: "",
    run: (event, state, arg) => run(event, state, () => validate(arg)),
    validate,
    bind(payload, validated_arg) {
      const { event, state } = get_request_store();
      return create_live_query_resource(
        __,
        payload,
        event,
        state,
        () => run(event, state, () => validated_arg)
      );
    }
  };
  const wrapper = (arg) => {
    if (prerendering) {
      throw new Error(
        `Cannot call query.live '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
      );
    }
    const { event, state } = get_request_store();
    const payload = stringify_remote_arg(arg, state.transport);
    return create_live_query_resource(
      __,
      payload,
      event,
      state,
      () => run(event, state, () => validate(arg))
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
// @__NO_SIDE_EFFECTS__
function batch(validate_or_fn, maybe_fn) {
  const fn = maybe_fn ?? validate_or_fn;
  const validate = create_validator(validate_or_fn, maybe_fn);
  const enqueue = (payload, get_validated) => {
    const { event, state } = get_request_store();
    return new Promise((resolve, reject) => {
      const batches = state.remote.batches ??= /** @type {NonNullable<typeof state.remote.batches>} */
      /* @__PURE__ */ new Map();
      let batched = batches.get(__.id);
      if (!batched) {
        batched = /* @__PURE__ */ new Map();
        batches.set(__.id, batched);
      }
      const entry = batched.get(payload);
      if (entry) {
        entry.resolvers.push({ resolve, reject });
        return;
      }
      batched.set(payload, {
        get_validated,
        resolvers: [{ resolve, reject }]
      });
      if (batched.size > 1) return;
      setTimeout(async () => {
        batches.delete(__.id);
        const entries = Array.from(batched.values());
        try {
          return await run_remote_function(
            event,
            { ...state, is_in_remote_query: true },
            false,
            async () => Promise.all(entries.map((entry2) => entry2.get_validated())),
            async (input) => {
              const get_result = await fn(input);
              for (let i = 0; i < entries.length; i++) {
                try {
                  const result = get_result(input[i], i);
                  for (const resolver of entries[i].resolvers) {
                    resolver.resolve(result);
                  }
                } catch (error2) {
                  for (const resolver of entries[i].resolvers) {
                    resolver.reject(error2);
                  }
                }
              }
            }
          );
        } catch (error2) {
          for (const entry2 of batched.values()) {
            for (const resolver of entry2.resolvers) {
              resolver.reject(error2);
            }
          }
        }
      }, 0);
    });
  };
  const __ = {
    type: "query_batch",
    id: "",
    name: "",
    validate,
    run: async (args, options) => {
      const { event, state } = get_request_store();
      return run_remote_function(
        event,
        { ...state, is_in_remote_query: true },
        false,
        async () => Promise.all(args.map(validate)),
        async (input) => {
          const get_result = await fn(input);
          return Promise.all(
            input.map(async (arg, i) => {
              try {
                const data = get_result(arg, i);
                return { type: "result", data };
              } catch (error2) {
                return {
                  type: "error",
                  error: await handle_error_and_jsonify(event, state, options, error2),
                  status: error2 instanceof HttpError || error2 instanceof SvelteKitError ? error2.status : 500
                };
              }
            })
          );
        }
      );
    },
    bind(payload, validated_arg) {
      const { event, state } = get_request_store();
      return create_query_resource(
        __,
        payload,
        event,
        state,
        () => enqueue(payload, () => validated_arg)
      );
    }
  };
  const wrapper = (arg) => {
    if (prerendering) {
      throw new Error(
        `Cannot call query.batch '${__.name}' while prerendering, as prerendered pages need static data. Use 'prerender' from $app/server instead`
      );
    }
    const { event, state } = get_request_store();
    const payload = stringify_remote_arg(arg, state.transport);
    return create_query_resource(
      __,
      payload,
      event,
      state,
      () => (
        // Collect all the calls to the same query in the same macrotask,
        // then execute them as one backend request.
        enqueue(payload, () => validate(arg))
      )
    );
  };
  Object.defineProperty(wrapper, "__", { value: __ });
  return wrapper;
}
function refresh(event, state, internals, payload, fn) {
  if (!internals.id) {
    return;
  }
  if (!event.isRemoteRequest) {
    return;
  }
  const key = create_remote_key(internals.id, payload);
  const promise = fn();
  promise.catch(() => {
  });
  (state.remote.explicit ??= /* @__PURE__ */ new Map()).set(key, {
    internals,
    promise
  });
}
function create_query_resource(__, payload, event, state, fn) {
  let promise = null;
  const get_promise = () => {
    return promise ??= get_response(__, payload, state, fn);
  };
  const populate_hydratable = () => {
    if (__.id && state.is_in_render) {
      get_promise().catch(noop);
    }
  };
  return {
    /** @type {Promise<any>['catch']} */
    catch(onrejected) {
      return get_promise().catch(onrejected);
    },
    get current() {
      populate_hydratable();
      return void 0;
    },
    get error() {
      populate_hydratable();
      return void 0;
    },
    /** @type {Promise<any>['finally']} */
    finally(onfinally) {
      return get_promise().finally(onfinally);
    },
    get loading() {
      populate_hydratable();
      return true;
    },
    get ready() {
      populate_hydratable();
      return false;
    },
    refresh() {
      promise = null;
      delete get_cache(__, state)[payload];
      refresh(event, state, __, payload, get_promise);
      return Promise.resolve();
    },
    /** @param {any} value */
    set(value) {
      const p = promise = Promise.resolve(value);
      get_cache(__, state)[payload] = p;
      refresh(event, state, __, payload, () => p);
    },
    // TODO 3.0 remove this
    // @ts-expect-error This method no longer exists
    run() {
      throw new Error(
        `\`myQuery().run()\` has been removed — please replace it with \`myQuery()\`. See https://github.com/sveltejs/kit/pull/15779 for more details`
      );
    },
    /** @type {Promise<any>['then']} */
    then(onfulfilled, onrejected) {
      return get_promise().then(onfulfilled, onrejected);
    },
    withOverride() {
      throw new Error(`Cannot call '${__.name}.withOverride()' on the server`);
    },
    get [Symbol.toStringTag]() {
      return "QueryResource";
    }
  };
}
function create_live_query_resource(__, payload, event, state, get_generator) {
  let promise = null;
  const get_first_value = async () => {
    for await (const value of get_generator()) {
      return value;
    }
    throw new Error(`query.live '${__.name}' did not yield a value`);
  };
  const get_promise = () => {
    return promise ??= get_response(__, payload, state, get_first_value);
  };
  const populate_hydratable = () => {
    if (__.id && state.is_in_render) {
      get_promise().catch(noop);
    }
  };
  return {
    /** @type {Promise<any>['catch']} */
    catch(onrejected) {
      return get_promise().catch(onrejected);
    },
    get current() {
      populate_hydratable();
      return void 0;
    },
    get error() {
      populate_hydratable();
      return void 0;
    },
    /** @type {Promise<any>['finally']} */
    finally(onfinally) {
      return get_promise().finally(onfinally);
    },
    get done() {
      populate_hydratable();
      return false;
    },
    get loading() {
      populate_hydratable();
      return true;
    },
    get ready() {
      populate_hydratable();
      return false;
    },
    get connected() {
      populate_hydratable();
      return false;
    },
    reconnect() {
      promise = null;
      delete get_cache(__, state)[payload];
      refresh(event, state, __, payload, get_promise);
      return Promise.resolve();
    },
    /** @ts-expect-error This method no longer exists */
    run() {
      throw new Error(
        "`.run()` has been removed from live queries. Use `for await (const value of liveQuery())` instead."
      );
    },
    /** @type {Promise<any>['then']} */
    then(onfulfilled, onrejected) {
      return get_promise().then(onfulfilled, onrejected);
    },
    [Symbol.asyncIterator]() {
      const key = create_remote_key(__.id, payload);
      const cache = state.remote.live_iterators ??= /* @__PURE__ */ new Map();
      let cached = cache.get(key);
      if (!cached) {
        cached = create_shared_live_iterator(event.request.signal, get_generator);
        cache.set(key, cached);
      }
      return cached.subscribe();
    },
    get [Symbol.toStringTag]() {
      return "LiveQueryResource";
    }
  };
}
function create_shared_live_iterator(signal, get_generator) {
  return new SharedIterator((instance) => {
    if (signal.aborted) {
      instance.done();
      return noop;
    }
    const generator = get_generator();
    let aborted = false;
    const close = () => {
      aborted = true;
      void generator.return().catch(noop);
    };
    signal.addEventListener("abort", () => (close(), instance.done()), { once: true });
    void (async () => {
      try {
        while (true) {
          const result = await generator.next();
          if (result.done) {
            instance.done();
            return;
          }
          instance.push(result.value);
        }
      } catch (error2) {
        if (!aborted) instance.fail(error2);
      } finally {
        close();
      }
    })();
    return close;
  });
}
Object.defineProperty(query, "batch", { value: batch, enumerable: true });
Object.defineProperty(query, "live", { value: live, enumerable: true });
export {
  get_response as a,
  run_remote_function as b,
  create_validator as c,
  get_implicit_lookup as d,
  get_cache as g,
  parse_remote_response as p,
  query as q,
  refresh as r
};
