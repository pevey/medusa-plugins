import "./url.js";
import { getRequestEvent } from "@sveltejs/kit/internal/server";
import "./root.js";
import "./utils.js";
import { c as command } from "./command.js";
import { f as form } from "./form.js";
import { invalid } from "@sveltejs/kit";
import "./query.js";
import { init_remote_functions } from "@sveltejs/kit/internal";
import { o as object, p as pipe, b as minLength, s as string, e as email } from "./index.js";
import { g as getConfig, c as createAuthClient, a as getClient } from "./state.js";
import { p as parseSetCookieSession } from "./session.js";
const m = /* @__PURE__ */ Object.freeze(/* @__PURE__ */ Object.defineProperty({
  __proto__: null,
  get login() {
    return login;
  },
  get logout() {
    return logout;
  }
}, Symbol.toStringTag, { value: "Module" }));
const login = form(object({
  email: pipe(string(), email()),
  password: pipe(string(), minLength(1))
}), async ({ email: email2, password }, issue) => {
  const cfg = getConfig();
  const { cookies } = getRequestEvent();
  const authClient = createAuthClient();
  let token;
  try {
    const result = await authClient.auth.login("customer", "emailpass", { email: email2, password });
    if (typeof result !== "string") {
      invalid(issue.email("Unsupported login flow"));
    }
    token = result;
  } catch {
    invalid(issue.email("Invalid email or password"));
  }
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
    invalid(issue.email("Could not establish session"));
  const setCookies = res.headers.getSetCookie?.() ?? [];
  const session = parseSetCookieSession(setCookies, cfg.backendSessionCookie, Date.now());
  if (!session)
    invalid(issue.email("No session returned by backend"));
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
  return { success: true };
});
const logout = command(async () => {
  const { cookies } = getRequestEvent();
  cookies.delete(getConfig().cookies.session, { path: "/" });
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
