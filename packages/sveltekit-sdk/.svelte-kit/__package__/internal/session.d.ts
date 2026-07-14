export interface ParsedSession {
    value: string;
    maxAge?: number;
}
/**
 * Extract the backend session cookie (e.g. `connect.sid`) from the Set-Cookie
 * headers returned by `POST /auth/session`. `now` is injected for testability.
 */
export declare function parseSetCookieSession(setCookieHeaders: string[], backendSessionCookie: string, now: number): ParsedSession | null;
/** Build the Cookie header that replays the backend session, server-side only. */
export declare function buildSessionHeader(sessionValue: string | undefined, backendSessionCookie: string): Record<string, string>;
