import { s as setConfig, g as getConfig, a as getClient } from "../chunks/state.js";
import { r as resolveContext } from "../chunks/products.remote.js";
import "../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../chunks/root.js";
import "../chunks/utils.js";
import "@sveltejs/kit";
import "../chunks/shared.js";
import "@sveltejs/kit/internal";
import "../chunks/query.js";
import "@medusajs/js-sdk";
import "cookie";
import "../chunks/regions.remote.js";
function createMedusaHandle(config) {
  setConfig(config);
  return async ({ event, resolve }) => {
    event.locals.medusa = resolveContext(getClient(), getConfig(), event.cookies);
    return resolve(event);
  };
}
const MEDUSA_BACKEND_URL = "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY = "pk_197851e94ecdb30e10e6a7bd1053818fdabae56978adbbd65d8059f24f30535d";
const MEDUSA_DEFAULT_COUNTRY_CODE = "us";
const handle = createMedusaHandle({
  baseUrl: MEDUSA_BACKEND_URL,
  publishableKey: MEDUSA_PUBLISHABLE_KEY,
  defaultRegionId: void 0,
  defaultCountryCode: MEDUSA_DEFAULT_COUNTRY_CODE
});
export {
  handle
};
