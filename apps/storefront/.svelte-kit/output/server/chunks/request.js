import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import "@sveltejs/kit";
import "./shared.js";
import "@sveltejs/kit/internal";
import "./query.js";
import { g as getConfig, a as getClient } from "./state.js";
import { f as buildSessionHeader } from "./index.js";
function resolveContext(client, config, cookies) {
  const region_id = cookies.get(config.cookies.region) || config.defaultRegionId || "";
  const country_code = cookies.get(config.cookies.country) || config.defaultCountryCode || "";
  const sessionValue = cookies.get(config.cookies.session);
  return {
    client,
    region_id,
    country_code,
    headers: () => buildSessionHeader(sessionValue, config.backendSessionCookie)
  };
}
function requestContext() {
  const { cookies } = getRequestEvent();
  return resolveContext(getClient(), getConfig(), cookies);
}
export {
  requestContext as a,
  resolveContext as r
};
