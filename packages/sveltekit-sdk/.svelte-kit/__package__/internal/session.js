import * as cookie from 'cookie';
/**
 * Extract the backend session cookie (e.g. `connect.sid`) from the Set-Cookie
 * headers returned by `POST /auth/session`. `now` is injected for testability.
 */
export function parseSetCookieSession(setCookieHeaders, backendSessionCookie, now) {
    for (const raw of setCookieHeaders) {
        const parsed = cookie.parse(raw);
        const value = parsed[backendSessionCookie];
        if (value) {
            const result = { value };
            if (parsed['Expires']) {
                const expires = new Date(parsed['Expires']).getTime();
                if (!Number.isNaN(expires))
                    result.maxAge = Math.floor((expires - now) / 1000);
            }
            return result;
        }
    }
    return null;
}
/** Build the Cookie header that replays the backend session, server-side only. */
export function buildSessionHeader(sessionValue, backendSessionCookie) {
    if (!sessionValue)
        return {};
    return { Cookie: `${backendSessionCookie}=${sessionValue}` };
}
