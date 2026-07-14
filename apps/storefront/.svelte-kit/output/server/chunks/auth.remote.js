import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import { f as form } from "./form.js";
import "@sveltejs/kit";
import "./query.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { a as object, p as pipe, e as email, n as nonEmpty, s as string, d as parseSetCookieSession } from "./index.js";
import { c as createAuthClient, g as getConfig, a as getClient } from "./state.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get login() {
    return login;
  },
  get logout() {
    return logout;
  },
  get register() {
    return register;
  },
  get requestResetPassword() {
    return requestResetPassword;
  },
  get resetPassword() {
    return resetPassword;
  }
}, Symbol.toStringTag, { value: "Module" }));
const credentialsSchema = object({
  email: pipe(string(), nonEmpty(), email()),
  password: pipe(string(), nonEmpty())
});
async function establishSession(token) {
  const cfg = getConfig();
  const { cookies } = getRequestEvent();
  const res = await fetch(`${cfg.baseUrl}/auth/session`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-publishable-api-key": cfg.publishableKey,
      ...cfg.globalHeaders,
      Authorization: `Bearer ${token}`
    }
  });
  if (!res.ok)
    return false;
  const session = parseSetCookieSession(res.headers.getSetCookie?.() ?? [], cfg.backendSessionCookie, Date.now());
  if (!session)
    return false;
  cookies.set(cfg.cookies.session, session.value, {
    path: "/",
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    ...session.maxAge ? { maxAge: session.maxAge } : {}
  });
  if (cfg.transferCartOnLogin) {
    const cartId = cookies.get(cfg.cookies.cart);
    if (cartId) {
      await getClient().store.cart.transferCart(cartId, {}, { Cookie: `${cfg.backendSessionCookie}=${session.value}` }).catch(() => {
      });
    }
  }
  return true;
}
const login = form(credentialsSchema, async ({ email: email2, password }) => {
  const authClient = createAuthClient();
  let token;
  try {
    const result = await authClient.auth.login("customer", "emailpass", { email: email2, password });
    if (typeof result !== "string")
      return { ok: false, code: "unsupported" };
    token = result;
  } catch (e) {
    const err = e;
    if (err.status === 401)
      return { ok: false, code: "invalid_credentials" };
    if (err.status === 429)
      return { ok: false, code: "rate_limited" };
    return { ok: false, code: "unknown" };
  }
  return await establishSession(token) ? { ok: true } : { ok: false, code: "unknown" };
});
const register = form(credentialsSchema, async ({ email: email2, password }) => {
  const authClient = createAuthClient();
  let token;
  try {
    const result = await authClient.auth.register("customer", "emailpass", { email: email2, password });
    if (typeof result !== "string")
      return { ok: false, code: "unsupported" };
    token = result;
  } catch (e) {
    const err = e;
    const message = String(err.message ?? "");
    if (err.status === 401 || err.status === 409 || /exist/i.test(message))
      return { ok: false, code: "email_exists" };
    return { ok: false, code: "unknown" };
  }
  try {
    await authClient.store.customer.create({ email: email2 }, {}, { Authorization: `Bearer ${token}` });
  } catch {
    return { ok: false, code: "unknown" };
  }
  const loginResult = await createAuthClient().auth.login("customer", "emailpass", { email: email2, password });
  if (typeof loginResult !== "string")
    return { ok: false, code: "unsupported" };
  return await establishSession(loginResult) ? { ok: true } : { ok: false, code: "unknown" };
});
const requestResetPassword = form(object({ email: pipe(string(), nonEmpty(), email()) }), async ({ email: email2 }) => {
  try {
    await getClient().auth.resetPassword("customer", "emailpass", { identifier: email2 });
  } catch {
  }
  return { ok: true };
});
const resetPassword = form(object({
  password: pipe(string(), nonEmpty()),
  token: pipe(string(), nonEmpty())
}), async ({ password, token }) => {
  try {
    await getClient().auth.updateProvider("customer", "emailpass", { password }, token);
    return { ok: true };
  } catch {
    return { ok: false, code: "unknown" };
  }
});
const logout = command(async () => {
  const { cookies } = getRequestEvent();
  cookies.delete(getConfig().cookies.session, { path: "/" });
  return { ok: true };
});
init_remote_functions(m, "../../packages/sveltekit-sdk/dist/auth.remote.js", "101ujqe");
for (const [name, fn] of Object.entries(m)) {
  fn.__.id = "101ujqe/" + name;
  fn.__.name = name;
}
export {
  login as l,
  m
};
