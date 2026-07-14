import { s as setConfig, g as getConfig, a as getClient } from "../chunks/state.js";
import { r as resolveContext } from "../chunks/request.js";
import "../chunks/url.js";
import "@sveltejs/kit/internal/server";
import "../chunks/root.js";
import "../chunks/utils.js";
import "@sveltejs/kit";
import "../chunks/shared.js";
import "@sveltejs/kit/internal";
import "../chunks/query.js";
import "@medusajs/js-sdk";
import "../chunks/regions.remote.js";
import "../chunks/products.remote.js";
import "../chunks/categories.remote.js";
import "../chunks/collections.remote.js";
import "../chunks/cart.remote.js";
import "../chunks/promotions.remote.js";
import "../chunks/payment.remote.js";
import "../chunks/braintree.remote.js";
import "../chunks/orders.remote.js";
import "../chunks/auth.remote.js";
import "../chunks/customer.remote.js";
import "../chunks/address.remote.js";
import "../chunks/search.remote.js";
import "../chunks/forms.remote.js";
function createMedusaHandle(config) {
  setConfig(config);
  return async ({ event, resolve }) => {
    event.locals.medusa = resolveContext(getClient(), getConfig(), event.cookies);
    return resolve(event);
  };
}
const MEDUSA_BACKEND_URL = "http://localhost:9000";
const MEDUSA_PUBLISHABLE_KEY = "pk_4ece4a910695b83f4a74f9e56152e94692a90ac9cf8ab53bb7ab44825b1e5eff";
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
