import * as cookie from "cookie";
function parseSetCookieSession(setCookieHeaders, backendSessionCookie, now) {
  for (const raw of setCookieHeaders) {
    const parsed = cookie.parse(raw);
    const value = parsed[backendSessionCookie];
    if (value) {
      const result = { value };
      if (parsed["Expires"]) {
        const expires = new Date(parsed["Expires"]).getTime();
        if (!Number.isNaN(expires))
          result.maxAge = Math.floor((expires - now) / 1e3);
      }
      return result;
    }
  }
  return null;
}
function buildSessionHeader(sessionValue, backendSessionCookie) {
  if (!sessionValue)
    return {};
  return { Cookie: `${backendSessionCookie}=${sessionValue}` };
}
export {
  buildSessionHeader as b,
  parseSetCookieSession as p
};
