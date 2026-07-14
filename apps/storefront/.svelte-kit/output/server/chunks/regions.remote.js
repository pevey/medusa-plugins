import './url.js';
import '@sveltejs/kit/internal/server';
import './root.js';
import './utils.js';
import '@sveltejs/kit';
import './shared.js';
import { init_remote_functions } from '@sveltejs/kit/internal';
import { p } from './prerender.js';
import './query.js';
import './state.js';

const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get getRegions() {
    return getRegions;
  }
}, Symbol.toStringTag, { value: "Module" }));
const getRegions = p('unchecked', () => { throw new Error('Unexpectedly called prerender function. Did you forget to set { dynamic: true } ?') });
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/regions.remote.js", "v8uztx");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "v8uztx/" + name;
  fn.__.name = name;
}

export { getRegions as g, m };
