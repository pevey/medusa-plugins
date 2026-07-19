import type { GetClearanceOptions } from './types.js'
import { turnstileLoaded } from './stores.js'

const TURNSTILE_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js'
const TURNSTILE_SCRIPT = `${TURNSTILE_SRC}?render=explicit`

/**
 * Programmatically obtain Cloudflare pre-clearance on the client.
 *
 * Renders a Turnstile widget (hidden by default), runs the challenge, and resolves the
 * Turnstile token on success. When the widget's site key has pre-clearance enabled in the
 * Cloudflare dashboard and is served on the protected zone, Cloudflare sets the httpOnly
 * `cf_clearance` cookie automatically as a side effect. Validate the returned token
 * server-side with `validateToken`.
 */
export default async function getClearance(
	siteKey: string,
	options: GetClearanceOptions = {}
): Promise<string> {
	if (typeof window === 'undefined' || typeof document === 'undefined') {
		throw new Error('getClearance can only be called in the browser')
	}

	await loadTurnstileScript()

	// Use the caller's container, or create an off-screen one we own and clean up.
	const ownContainer = !options.container
	const container = options.container ?? createHiddenContainer()

	let widgetId: string | undefined
	let timer: ReturnType<typeof setTimeout> | undefined

	try {
		return await new Promise<string>((resolve, reject) => {
			if (options.timeoutMs) {
				timer = setTimeout(
					() => reject(new Error('getClearance timed out')),
					options.timeoutMs
				)
			}

			widgetId = window.turnstile.render(container, {
				sitekey: siteKey,
				action: options.action,
				cData: options.cData,
				appearance: options.appearance ?? 'interaction-only',
				execution: options.execution ?? 'render',
				theme: options.theme,
				language: options.language,
				size: options.size,
				callback: (token: string) => resolve(token),
				'error-callback': (code: string) => reject(new Error(`Turnstile error: ${code}`)),
				'timeout-callback': () => reject(new Error('Turnstile challenge timed out')),
				'unsupported-callback': () => reject(new Error('Turnstile is not supported in this browser'))
			})

			if ((options.execution ?? 'render') === 'execute') {
				window.turnstile.execute(container)
			}
		})
	} finally {
		if (timer) clearTimeout(timer)
		if (widgetId) {
			try {
				window.turnstile.remove(widgetId)
			} catch {
				/* widget already gone */
			}
		}
		if (ownContainer) container.remove()
	}
}

function createHiddenContainer(): HTMLElement {
	const el = document.createElement('div')
	// Off-screen rather than `display: none`, which can prevent the widget rendering.
	el.style.position = 'absolute'
	el.style.width = '1px'
	el.style.height = '1px'
	el.style.overflow = 'hidden'
	el.style.left = '-9999px'
	el.style.top = '-9999px'
	document.body.appendChild(el)
	return el
}

function loadTurnstileScript(): Promise<void> {
	return new Promise((resolve, reject) => {
		if (window.turnstile) {
			window.turnstile.ready(() => { turnstileLoaded.set(true); resolve() })
			return
		}

		const existing = document.querySelector<HTMLScriptElement>(`script[src^="${TURNSTILE_SRC}"]`)
		if (existing) {
			existing.addEventListener('load', () => window.turnstile.ready(() => { turnstileLoaded.set(true); resolve() }))
			existing.addEventListener('error', () => reject(new Error('Failed to load the Turnstile script')))
			return
		}

		const script = document.createElement('script')
		script.src = TURNSTILE_SCRIPT
		script.async = true
		script.addEventListener('load', () => window.turnstile.ready(() => { turnstileLoaded.set(true); resolve() }))
		script.addEventListener('error', () => reject(new Error('Failed to load the Turnstile script')))
		document.head.appendChild(script)
	})
}
