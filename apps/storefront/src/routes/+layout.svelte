<script lang="ts">
	import './layout.css'
	import { ModeWatcher } from 'mode-watcher'
	import { MetaProvider } from '$lib/components/ui/seo'

	const { children } = $props()
</script>

<ModeWatcher />
<MetaProvider
	site={{
		siteName: 'Storefront Dev',
		siteUrl: 'http://localhost:5173',
		titleTemplate: '%s | Storefront Dev'
	}}
>
	{@render children()}
</MetaProvider>
