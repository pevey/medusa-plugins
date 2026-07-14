import { form, command, getRequestEvent } from '$app/server'
import { invalid } from '@sveltejs/kit'
import * as v from 'valibot'
import { createAuthClient, getClient, getConfig } from './internal/state'
import { parseSetCookieSession } from './internal/session'

export const login = form(
  v.object({
    email: v.pipe(v.string(), v.email()),
    password: v.pipe(v.string(), v.minLength(1))
  }),
  async ({ email, password }, issue) => {
    const cfg = getConfig()
    const { cookies } = getRequestEvent()

    // 1. Authenticate on a throwaway client so the shared client's auth state is untouched.
    const authClient = createAuthClient()
    let token: string
    try {
      const result = await authClient.auth.login('customer', 'emailpass', { email, password })
      if (typeof result !== 'string') {
        // MFA / third-party redirect flows are out of scope for this slice.
        invalid(issue.email('Unsupported login flow'))
      }
      token = result as string
    } catch {
      invalid(issue.email('Invalid email or password'))
    }

    // 2. Exchange the token for a backend session and capture Set-Cookie.
    const res = await fetch(`${cfg.baseUrl}/auth/session`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-publishable-api-key': cfg.publishableKey,
        ...cfg.globalHeaders,
        Authorization: `Bearer ${token!}`
      }
    })
    if (!res.ok) invalid(issue.email('Could not establish session'))

    const setCookies = res.headers.getSetCookie?.() ?? []
    const session = parseSetCookieSession(setCookies, cfg.backendSessionCookie, Date.now())
    if (!session) invalid(issue.email('No session returned by backend'))

    // 3. Rename connect.sid → sid (configurable) on the storefront.
    cookies.set(cfg.cookies.session, session!.value, {
      path: '/', httpOnly: true, secure: true, sameSite: 'strict',
      ...(session!.maxAge ? { maxAge: session!.maxAge } : {})
    })

    // 4. Optional cart transfer. Never abort login on failure.
    if (cfg.transferCartOnLogin) {
      const cartId = cookies.get(cfg.cookies.cart)
      if (cartId) {
        await getClient()
          .store.cart.transferCart(cartId, {}, { Cookie: `${cfg.backendSessionCookie}=${session!.value}` })
          .catch(() => {})
      }
    }

    return { success: true }
  }
)

export const logout = command(async () => {
  const { cookies } = getRequestEvent()
  cookies.delete(getConfig().cookies.session, { path: '/' })
})
