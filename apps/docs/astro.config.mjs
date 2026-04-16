import { readFileSync } from 'node:fs'
import starlight from '@astrojs/starlight'
import { defineConfig } from 'astro/config'
import tailwindcss from '@tailwindcss/vite'
import starlightOpenAPI from 'starlight-openapi'
import starlightLlmsTxt from 'starlight-llms-txt'

// Load generated sidebar data (operation links grouped by tag per plugin)
const apiSidebar = JSON.parse(
	readFileSync(new URL('./schemas/_sidebar.json', import.meta.url), 'utf-8')
)

// All plugins sorted alphabetically by label
const plugins = [
	{ slug: 'medusa-plugin-analytics', label: 'Analytics', schemaFile: 'analytics' },
	{ slug: 'medusa-plugin-barcodes', label: 'Barcodes', schemaFile: 'barcodes' },
	{ slug: 'medusa-plugin-braintree', label: 'Braintree Payments' },
	{ slug: 'medusa-plugin-complaints', label: 'Complaints', schemaFile: 'complaints' },
	{ slug: 'medusa-plugin-content', label: 'Content', schemaFile: 'content' },
	{ slug: 'medusa-plugin-customer-tags', label: 'Customer Tags', schemaFile: 'customer-tags' },
	{ slug: 'medusa-plugin-forms', label: 'Forms', schemaFile: 'forms' },
	{ slug: 'medusa-plugin-order-notes', label: 'Order Notes', schemaFile: 'order-notes' },
	{ slug: 'medusa-plugin-r2', label: 'R2 File Storage' },
	{ slug: 'medusa-plugin-ratings', label: 'Reviews', schemaFile: 'reviews' },
	{ slug: 'medusa-plugin-ses', label: 'SES Notifications' },
	{ slug: 'medusa-plugin-statistics', label: 'Statistics', schemaFile: 'statistics' },
	{ slug: 'medusa-plugin-tax-lookup', label: 'Tax Lookup' },
	{ slug: 'medusa-plugin-tracing', label: 'Tracing', schemaFile: 'tracing' },
	{ slug: 'medusa-plugin-veeqo', label: 'Veeqo', schemaFile: 'veeqo' },
	{ slug: 'medusa-plugin-webhooks', label: 'Webhooks', schemaFile: 'webhooks' }
]

// Build OpenAPI plugin configs
const apiPluginConfigs = plugins
	.filter(p => p.schemaFile)
	.map(p => ({
		base: `${p.slug}/api`,
		schema: `./schemas/${p.schemaFile}.yaml`,
		label: p.label
	}))

// Build sidebar — one group per plugin, alphabetically
function buildPluginSidebar(p) {
	const items = [{ label: 'Overview', slug: p.slug }]
	if (p.schemaFile && apiSidebar[p.slug]) {
		items.push(...apiSidebar[p.slug])
	}
	return { label: p.label, items }
}

export default defineConfig({
	site: 'https://pevey.com',
	output: 'static',
	vite: { plugins: [tailwindcss()] },
	integrations: [
		starlight({
			title: 'Pevey Docs',
			plugins: [starlightOpenAPI(apiPluginConfigs), starlightLlmsTxt()],
			sidebar: [
				{
					label: '@pevey/medusa',
					items: [
						{ label: 'Overview', slug: 'medusa-sdk' },
					],
				},
				...plugins.map(p => buildPluginSidebar(p)),
				{
					label: 'SvelteKit Packages',
					items: [
						{ label: 'sveltekit-stripe', slug: 'sveltekit-stripe' },
						{ label: 'sveltekit-superfetch', slug: 'sveltekit-superfetch' },
						{ label: 'sveltekit-turnstile', slug: 'sveltekit-turnstile' }
					]
				}
			],
			social: [
				{ icon: 'github', label: 'GitHub', href: 'https://github.com/pevey/medusa-plugins' },
			],
			customCss: ['./src/styles/global.css'],
			favicon: '/favicon.png'
		})
	]
})
