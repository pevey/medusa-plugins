<script lang="ts">
	import { setSiteMetaContext } from './ctx.svelte.js'
	import type { SiteMeta } from './types.js'
	import type { Snippet } from 'svelte'
	let { site = {}, children }: { site?: SiteMeta; children: Snippet } = $props()
	setSiteMetaContext({
		get site() {
			return site
		}
	})
</script>

{@render children()}
