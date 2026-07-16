<script lang="ts">
	import { browser } from '$app/env'
	import { createAnalyticsCollector } from '@pevey/medusa-sdk'
	import { setCollector, clearCollector } from '../internal/analytics-singleton'

	interface Props {
		endpoint?: string
		batchSize?: number
		flushInterval?: number
	}

	let { endpoint = '/api/analytics', batchSize, flushInterval }: Props = $props()

	// Create the collector once, browser-only, and register it as the singleton
	// that `track`/`identify` delegate to. Identity is server-stamped, so there is
	// no cart id to sync here. Cleanup destroys it and clears the singleton.
	$effect(() => {
		if (!browser) return

		const collector = createAnalyticsCollector({ endpoint, batchSize, flushInterval })
		setCollector(collector)

		return () => {
			collector.destroy()
			clearCollector()
		}
	})
</script>
