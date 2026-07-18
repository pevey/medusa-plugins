# Change Log

## 2.0.2

- Expose additional configuration options: refresh-expired, refresh-timeout, and appearance. See https://developers.cloudflare.com/turnstile/get-started/client-side-rendering/ for more information about these options.

## 2.0.0

- Bump Svelte and SvelteKit versions
- Replace shx with rimraf

## 1.2.0

- Bump versions on all dependencies to latest

## 1.1.0

- Added CHANGELOG
- Combined the two components (Turnstile and TurnstileElement) back into one component.  Using the two separate elements is no longer necessary since we are using a client-side svelte store ($turnstileLoaded) to track whether turnstile is loaded, and this store can be accessed across all component instances.
