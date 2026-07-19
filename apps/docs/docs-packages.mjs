// Canonical package list for the docs site — the single source of truth shared
// by the sidebar (astro.config.mjs) and the README-driven page generator
// (scripts/sync-readmes.mjs).
//
// Fields:
//   slug        docs route + content folder (src/content/docs/<slug>/)
//   label       sidebar label AND the generated page's frontmatter title
//   schemaFile  (optional) OpenAPI schema basename under schemas/ → adds an API sidebar group
//   dir         (optional) package folder under packages/ whose README.md drives the
//               Overview page. Entries WITH `dir` get an auto-generated `index.md`
//               (gitignored); entries WITHOUT `dir` keep a hand-authored `index.mdx`.
//               A blank README is fine — it yields a description-only page + a build
//               warning until the README is written (see sync-readmes.mjs).

export const plugins = [
	{ slug: 'medusa-plugin-access', label: 'Access Control', schemaFile: 'access', dir: 'access' },
	{ slug: 'medusa-plugin-affiliates', label: 'Affiliates', schemaFile: 'affiliates', dir: 'affiliates' },
	{ slug: 'medusa-plugin-analytics', label: 'Analytics', schemaFile: 'analytics', dir: 'analytics' },
	{ slug: 'medusa-plugin-automation', label: 'Automation', schemaFile: 'automation', dir: 'automation' },
	{ slug: 'medusa-plugin-barcodes', label: 'Barcodes', schemaFile: 'barcodes', dir: 'barcodes' },
	{ slug: 'medusa-plugin-braintree', label: 'Braintree Payments', dir: 'payment-braintree' }, // empty README → description-only page + warning until written
	{ slug: 'medusa-plugin-complaints', label: 'Complaints', schemaFile: 'complaints', dir: 'complaints' },
	{ slug: 'medusa-plugin-content', label: 'Content', schemaFile: 'content', dir: 'content' },
	{ slug: 'medusa-plugin-customer-tags', label: 'Customer Tags', schemaFile: 'customer-tags', dir: 'customer-tags' },
	{ slug: 'medusa-plugin-forms', label: 'Forms', schemaFile: 'forms', dir: 'forms' },
	{ slug: 'medusa-plugin-mcp', label: 'MCP', schemaFile: 'mcp', dir: 'mcp' },
	{ slug: 'medusa-plugin-order-notes', label: 'Order Notes', schemaFile: 'order-notes', dir: 'order-notes' },
	{ slug: 'medusa-plugin-r2', label: 'R2 File Storage', dir: 'file-r2' },
	{ slug: 'medusa-plugin-ratings', label: 'Reviews', schemaFile: 'reviews', dir: 'reviews' },
	{ slug: 'medusa-plugin-search', label: 'Search', schemaFile: 'search', dir: 'search' },
	{ slug: 'medusa-plugin-ses', label: 'SES Notifications', dir: 'notification-ses' },
	{ slug: 'medusa-plugin-statistics', label: 'Statistics', schemaFile: 'statistics', dir: 'statistics' },
	{ slug: 'medusa-plugin-tax-lookup', label: 'Tax Lookup', dir: 'tax-lookup' },
	{ slug: 'medusa-plugin-tracing', label: 'Tracing', schemaFile: 'tracing', dir: 'tracing' },
	{ slug: 'medusa-plugin-veeqo', label: 'Veeqo', schemaFile: 'veeqo', dir: 'veeqo' }
]

// Non-plugin docs packages that are also README-driven. Their sidebar groups are
// declared directly in astro.config.mjs; this list only feeds sync-readmes.mjs.
export const otherReadmePackages = [
	{ slug: 'medusa-js-sdk', label: 'Medusa SDK', dir: 'js-sdk' },
	{ slug: 'sveltekit-medusa-sdk', label: 'sveltekit-medusa-sdk', dir: 'sveltekit-sdk' },
	{ slug: 'sveltekit-medusa-ui', label: 'sveltekit-medusa-ui', dir: 'sveltekit-ui' },
	{ slug: 'sveltekit-stripe', label: 'sveltekit-stripe', dir: 'sveltekit-stripe' },
	{ slug: 'sveltekit-turnstile', label: 'sveltekit-turnstile', dir: 'sveltekit-turnstile' }
]
