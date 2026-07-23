<script lang="ts">
	import { page } from '$app/state'
	import { getSiteMetaContextOptional } from './ctx.svelte.js'
	import type { MetaConfig } from './types.js'

	let { config = {} }: { config?: MetaConfig } = $props()
	const siteCtx = getSiteMetaContextOptional()
	const site = $derived(siteCtx?.site ?? {})

	const baseTitle = $derived(config.title ?? site.siteName ?? '')
	const isHome = $derived(page.url.pathname === '/')
	const title = $derived(
		!isHome && site.titleTemplate && baseTitle ? site.titleTemplate.replace('%s', baseTitle) : baseTitle
	)
	const description = $derived(config.description ?? site.description)
	const url = $derived(
		config.url ?? (site.siteUrl ? site.siteUrl.replace(/\/$/, '') + page.url.pathname : page.url.href)
	)
	const image = $derived(config.image ?? site.image)
	const imageAlt = $derived(config.imageAlt ?? site.imageAlt ?? baseTitle)
	const twitterCard = $derived(config.twitterCardType ?? site.twitterCardType ?? 'summary_large_image')
	const language = $derived(config.language ?? site.language ?? 'en')
	const ogType = $derived(config.ogType ?? 'website')
</script>

<svelte:head>
	<title>{title}</title>
	<link rel="canonical" href={url} />
	<meta name="title" content={title} />
	{#if description}<meta name="description" content={description} />{/if}
	{#if config.noindex}<meta name="robots" content="noindex" />{/if}
	{#if config.author}<meta name="author" content={config.author} />{/if}

	<meta property="og:type" content={ogType} />
	<meta property="og:url" content={url} />
	<meta property="og:title" content={title} />
	{#if description}<meta property="og:description" content={description} />{/if}
	{#if image}
		<meta property="og:image" content={image} />
		<meta property="og:image:alt" content={imageAlt} />
	{/if}
	{#if site.siteName}<meta property="og:site_name" content={site.siteName} />{/if}
	<meta property="og:locale" content={language} />

	<meta name="twitter:card" content={twitterCard} />
	<meta name="twitter:title" content={title} />
	{#if description}<meta name="twitter:description" content={description} />{/if}
	{#if image}<meta name="twitter:image" content={image} />{/if}
	{#if site.twitterHandle}<meta name="twitter:creator" content={site.twitterHandle} />{/if}
	{#if site.siteUrl}<meta property="twitter:url" content={url} />{/if}

	<meta itemprop="name" content={title} />
	{#if description}<meta itemprop="description" content={description} />{/if}
	{#if image}<meta itemprop="image" content={image} />{/if}
	{#if config.paymentPointer}<meta name="monetization" content={config.paymentPointer} />{/if}
</svelte:head>
