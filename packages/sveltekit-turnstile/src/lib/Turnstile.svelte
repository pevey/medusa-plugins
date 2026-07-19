<script lang="ts">
	import type {
		TurnstileAppearance,
		TurnstileExecution,
		TurnstileRefresh,
		TurnstileRetry,
		TurnstileSize,
		TurnstileTheme,
		TurnstileWidget
	} from './types.js'
	import type { Attachment } from 'svelte/attachments'
	import { browser } from '$app/env'
	import { onMount } from 'svelte'
	import { turnstileLoaded } from './stores.js'

	interface Props {
		siteKey: string
		fieldName?: string
		action?: string
		cData?: string
		retry?: TurnstileRetry
		retryInterval?: number
		theme?: TurnstileTheme
		size?: TurnstileSize
		forms?: boolean
		tabIndex?: number
		language?: string
		refreshExpired?: TurnstileRefresh
		refreshTimeout?: TurnstileRefresh
		appearance?: TurnstileAppearance
		execution?: TurnstileExecution
		feedbackEnabled?: boolean
		offlabelShowPrivacy?: boolean
		offlabelShowHelp?: boolean
		onCallback?: (token: string) => void
		onError?: (code: string) => void
		onExpired?: () => void
		onTimeout?: () => void
		onBeforeInteractive?: () => void
		onAfterInteractive?: () => void
		onUnsupported?: () => void
		widget?: TurnstileWidget
	}

	let {
		siteKey,
		fieldName = 'cf-turnstile-response',
		action = undefined,
		cData = undefined,
		retry = 'auto',
		retryInterval = 8000,
		theme = 'auto',
		size = 'normal',
		forms = true,
		tabIndex = 0,
		language = 'auto',
		refreshExpired = 'auto',
		refreshTimeout = 'auto',
		appearance = 'always',
		execution = 'render',
		feedbackEnabled = true,
		offlabelShowPrivacy = undefined,
		offlabelShowHelp = undefined,
		onCallback,
		onError,
		onExpired,
		onTimeout,
		onBeforeInteractive,
		onAfterInteractive,
		onUnsupported,
		widget = $bindable()
	}: Props = $props()

	let mounted = $state(false)

	onMount(() => {
		mounted = true
		return () => {
			mounted = false
		}
	})

	function turnstileCallback() {
		turnstileLoaded.set(true)
	}

	// Attachments are reactive: this re-runs (tearing down and re-rendering the widget)
	// whenever any render option read below changes. The `on*` callbacks are only
	// referenced inside handler closures, so they are not tracked and never force a
	// re-render. `widget` is assigned (not read) here, so it does not create a loop.
	const turnstile: Attachment<HTMLElement> = (node) => {
		try {
			const id = window.turnstile.render(node, {
				sitekey: siteKey,
				'response-field-name': fieldName,
				'response-field': forms,
				'timeout-callback': () => onTimeout?.(),
				'expired-callback': () => onExpired?.(),
				'error-callback': (code: string) => onError?.(code),
				'before-interactive-callback': () => onBeforeInteractive?.(),
				'after-interactive-callback': () => onAfterInteractive?.(),
				'unsupported-callback': () => onUnsupported?.(),
				callback: (token: string) => onCallback?.(token),
				'retry-interval': retryInterval,
				tabindex: tabIndex,
				action,
				retry,
				theme,
				cData,
				size,
				language,
				'refresh-expired': refreshExpired,
				'refresh-timeout': refreshTimeout,
				appearance,
				execution,
				'feedback-enabled': feedbackEnabled,
				'offlabel-show-privacy': offlabelShowPrivacy,
				'offlabel-show-help': offlabelShowHelp
			})

			widget = {
				id,
				execute: () => window.turnstile.execute(node),
				reset: () => window.turnstile.reset(id),
				getResponse: () => window.turnstile.getResponse(id),
				isExpired: () => window.turnstile.isExpired(id)
			}

			return () => {
				window.turnstile.remove(id)
				widget = undefined
			}
		} catch (error) {
			console.error(error)
		}
	}
</script>

<svelte:head>
	{#if browser && $turnstileLoaded == false}
		<script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" onload={turnstileCallback} async></script>
	{/if}
</svelte:head>

{#if mounted && $turnstileLoaded}
	<div {@attach turnstile}></div>
{/if}
