<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';
	import { MetaProvider } from '$lib/components/ui/seo';

	const { children } = $props();
</script>

<ModeWatcher />
<MetaProvider
	site={{
		siteName: 'Mildred Demo',
		siteUrl: 'http://localhost:5180',
		titleTemplate: '%s | Mildred',
		twitterHandle: '@mildred'
	}}
>
	{@render children()}
</MetaProvider>
