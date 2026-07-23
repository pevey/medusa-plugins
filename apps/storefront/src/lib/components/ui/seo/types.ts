export interface SiteMeta {
	siteName?: string
	siteShortName?: string
	siteUrl?: string
	description?: string
	image?: string
	imageAlt?: string
	twitterHandle?: string
	twitterCardType?: 'summary' | 'summary_large_image' | 'app' | 'player'
	language?: string
	titleTemplate?: string // '%s' is replaced by the page title; applied off the home route
}

export interface MetaConfig {
	title?: string
	description?: string
	url?: string
	noindex?: boolean
	image?: string
	imageAlt?: string
	author?: string
	ogType?: string
	paymentPointer?: string
	language?: string
	twitterCardType?: SiteMeta['twitterCardType']
}
