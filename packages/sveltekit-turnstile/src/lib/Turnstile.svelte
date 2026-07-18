<script lang="ts">
	import { browser } from '$app/env'
	import { onMount } from 'svelte'
	import { turnstileLoaded } from './stores.js'

	interface Props {
		siteKey: string
		fieldName?: string
		action?: string
		cData?: string
		retry?: 'auto' | 'never'
		retryInterval?: number
		theme?: 'light' | 'dark' | 'auto'
		size?: string
		forms?: boolean
		tabIndex?: number
		language?: string
		refreshExpired?: 'auto' | 'manual' | 'never'
		refreshTimeout?: 'auto' | 'manual' | 'never'
		appearance?: 'always' | 'execute' | 'interaction-only'
		onCallback?: (token: string) => void
		onError?: () => void
		onExpired?: () => void
		onTimeout?: () => void
	}

	let {
		siteKey,
		fieldName = 'token',
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
		onCallback,
		onError,
		onExpired,
		onTimeout
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

	// A fresh object whenever any option changes, so `{#key config}` recreates the
	// widget on option changes — this replaces the old `{#key $$props}`.
	const config = $derived({
		siteKey,
		fieldName,
		action,
		cData,
		retry,
		retryInterval,
		theme,
		size,
		forms,
		tabIndex,
		language,
		refreshExpired,
		refreshTimeout,
		appearance
	})

	const turnstile = (node: HTMLElement) => {
		try {
			const id = window.turnstile.render(node, {
				sitekey: siteKey,
				'response-field-name': fieldName,
				'timeout-callback': () => onTimeout?.(),
				'expired-callback': () => onExpired?.(),
				'error-callback': () => onError?.(),
				callback: (token: string) => onCallback?.(token),
				'retry-interval': retryInterval,
				'response-field': forms,
				tabindex: tabIndex,
				action,
				retry,
				theme,
				cData,
				size,
				language,
				'refresh-expired': refreshExpired,
				'refresh-timeout': refreshTimeout,
				appearance
			})
			return {
				destroy: () => {
					window.turnstile.remove(id)
				}
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
	{#key config}
		<div use:turnstile></div>
	{/key}
{/if}
