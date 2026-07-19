# sveltekit-turnstile

This package includes SvelteKit components for rendering forms and validating form submissions that include cloudflare turnstile tokens for enhanced security.

## Set Up

Two environment variables must be set, either in .env or by some other method.  You can obtain these keys by creating an account at cloudflare.com.  Add your domain to cloudflare (for free), and then add a turnstile site (also free).  Make note of the public and private keys.

.env

```bash
PUBLIC_TURNSTILE_SITE_KEY=""
SECRET_TURNSTILE_KEY=""

```

## Usage

Add the `Turnstile` component inside an html form element to generate a hidden token form field when the form is rendered.  When the form is submitted, the token will be added to the submitted form data and can be processed the same way as any other posted form data.

This component is designed in a way that allows you to have multiple forms protected by Turnstile loaded at the same time.

The validateToken method should only be used on the server.  Storing your secret key as an environment variable without the PUBLIC_ prefix will prevent the key from being accidentally exported to the client.  An error will be thrown.  One logical place to include a server-side request to validate a token would be inside a form action.  Alternatively, you could create an api endpoint and submit the token to the endpoint for validation via a custom use:enhance function.

client-side (+page.svelte)

```svelte
<script>
   import { Turnstile } from 'sveltekit-turnstile'
   import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public'
</script>

<form action="/" method="POST" name="form1" ... >
   <Turnstile siteKey={PUBLIC_TURNSTILE_SITE_KEY}/>
   <!-- other form elements -->
</form>

```

### Callback Props

The component exposes optional callback props (renamed from the previous `on:*`
events during the Svelte 5 migration):

```svelte
<script>
   import { Turnstile } from 'sveltekit-turnstile'
   import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public'
</script>

<Turnstile
   siteKey={PUBLIC_TURNSTILE_SITE_KEY}
   onCallback={(token) => console.log('token', token)}
   onError={(code) => console.log('error', code)}
   onExpired={() => console.log('expired')}
   onTimeout={() => console.log('timeout')}
   onBeforeInteractive={() => console.log('entering interactive challenge')}
   onAfterInteractive={() => console.log('left interactive challenge')}
   onUnsupported={() => console.log('browser unsupported')}
/>
```

### Field name

The hidden input holding the token is named `cf-turnstile-response` by default (matching
Cloudflare's default). Read it server-side with `data.get('cf-turnstile-response')`, or
override it with the `fieldName` prop:

```svelte
<Turnstile siteKey={PUBLIC_TURNSTILE_SITE_KEY} fieldName="token" />
```

### Deferred execution

By default the challenge runs as soon as the widget renders. Set `execution="execute"` to
render an idle widget and run the challenge on demand via the bound `widget` controls —
useful for running the challenge at form submit, on a route guard, or before a protected
request:

```svelte
<script>
   import { Turnstile } from 'sveltekit-turnstile'
   import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public'

   let widget = $state()
   let token = $state('')
</script>

<Turnstile
   siteKey={PUBLIC_TURNSTILE_SITE_KEY}
   execution="execute"
   bind:widget
   onCallback={(t) => (token = t)}
/>

<button onclick={() => widget?.execute()}>Verify</button>
```

The `widget` object exposes `{ id, execute(), reset(), getResponse(), isExpired() }`.

server-side (+page.server.js)

```svelte
import { validateToken } from 'sveltekit-turnstile'
import { SECRET_TURNSTILE_KEY } from '$env/static/private'

export const actions = {

   default: async ({request}) => {

      const data = await request.formData()
      const token = data.get('cf-turnstile-response')
      console.log(token)

      const success = await validateToken(token, SECRET_TURNSTILE_KEY)
      console.log(success)

      // if they pass the turnstile, we do other stuff with the form data here
      // if they do not pass the turnstile, we return with a failure

   }
}

```

Errors from within the components will be caused by a missing site key.  Any errors are caught within a try/catch block and displayed in the console.  Be sure to check the browser console if you have difficulty.

## Pre-clearance

Cloudflare [pre-clearance](https://developers.cloudflare.com/cloudflare-challenges/concepts/clearance/)
lets a solved Turnstile widget issue a `cf_clearance` cookie so the visitor bypasses
subsequent WAF challenges on your zone.

Two prerequisites, both configured in Cloudflare (not in this package):

1. **Enable pre-clearance on the widget** in the Turnstile dashboard (the widget's
   Settings → "opt for pre-clearance" → Yes → choose a level).
2. **The widget must be served on the same hostname as the protected zone** — the cookie
   is scoped to that zone.

When those are in place, solving the widget sets `cf_clearance` automatically (it is an
httpOnly cookie, so it is not readable from JavaScript). You still receive and must
validate the Turnstile token server-side.

### `getClearance` helper

For flows where you want to obtain clearance programmatically (e.g. before a protected
`fetch`, without placing a `<Turnstile>` in your markup), use `getClearance`:

```svelte
<script>
   import { getClearance } from 'sveltekit-turnstile'
   import { PUBLIC_TURNSTILE_SITE_KEY } from '$env/static/public'

   async function ensureClearance() {
      const token = await getClearance(PUBLIC_TURNSTILE_SITE_KEY)
      // cf_clearance is now set for the zone; subsequent requests pass the WAF.
      // Validate `token` server-side with validateToken before trusting it.
      await fetch('/protected', {
         method: 'POST',
         headers: { 'content-type': 'application/json' },
         body: JSON.stringify({ token })
      })
   }
</script>
```

`getClearance(siteKey, options?)` renders a hidden widget (off-screen, `interaction-only`
by default so it only appears if Cloudflare requires interaction), runs the challenge,
resolves the token, and cleans up. It rejects on error, an unsupported browser, or a
timeout (when `timeoutMs` is set). Options:
`{ action, cData, container, appearance, theme, language, size, execution, timeoutMs }`.
It must be called in the browser.

## Acknowledgment

This package initally borrowed from the first svelte component available for turnstile, which was written by @ghostdevv.
