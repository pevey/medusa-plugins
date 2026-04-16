#!/usr/bin/env node

/**
 * Generates OpenAPI YAML specs from Medusa plugin middleware and validator definitions.
 *
 * For each plugin with src/api/middlewares.ts and src/api/validators.ts, this script:
 * 1. Parses middlewares.ts to extract route definitions (paths, methods, validator refs, auth)
 * 2. Parses validators.ts to extract Zod schema shapes (field names, types, constraints)
 * 3. Outputs an openapi.yaml per plugin into apps/docs/schemas/
 */

import { readFileSync, writeFileSync, existsSync, readdirSync, mkdirSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { stringify } from 'yaml'

const ROOT = resolve(import.meta.dirname, '../../..')
const PACKAGES_DIR = join(ROOT, 'packages')
const OUTPUT_DIR = resolve(import.meta.dirname, '../schemas')

// ── Middleware Parser ────────────────────────────────────────────────────────

function parseMiddlewares(source) {
	const routes = []

	// Find each route block by matching the opening pattern, then use balanced bracket matching
	const startRegex = /\{\s*matcher:\s*['"]([^'"]+)['"]\s*,\s*method:\s*\[([^\]]*)\]\s*,/g
	let startMatch
	while ((startMatch = startRegex.exec(source)) !== null) {
		const matcherPath = startMatch[1]
		const methodsStr = startMatch[2]

		// Extract the full block using balanced braces from the opening {
		const blockStart = startMatch.index
		const fullBlock = extractBalanced(source, blockStart, '{', '}')
		if (!fullBlock) continue

		const methods = methodsStr.match(/['"](\w+)['"]/g)?.map(m => m.replace(/['"]/g, '')) || []
		const authenticated =
			fullBlock.includes('authenticate(') && !fullBlock.includes('allowUnauthenticated')

		// Extract validator references
		let queryValidator = null
		let bodyValidator = null

		const queryMatch = fullBlock.match(/validateAndTransformQuery\((\w+)/)
		if (queryMatch) queryValidator = queryMatch[1]

		const bodyMatch = fullBlock.match(/validateAndTransformBody\((\w+)/)
		if (bodyMatch) bodyValidator = bodyMatch[1]

		// Extract response field defaults and isList from validateAndTransformQuery config
		let responseDefaults = null
		let isList = false
		const defaultsMatch = fullBlock.match(/defaults:\s*\[([^\]]*)\]/)
		if (defaultsMatch) {
			responseDefaults =
				defaultsMatch[1].match(/['"]([^'"]+)['"]/g)?.map(s => s.replace(/['"]/g, '')) || []
		}
		const isListMatch = fullBlock.match(/isList:\s*(true|false)/)
		if (isListMatch) isList = isListMatch[1] === 'true'

		for (const method of methods) {
			routes.push({
				path: matcherPath.replace(/:(\w+)/g, '{$1}'),
				method: method.toLowerCase(),
				queryValidator,
				bodyValidator,
				authenticated,
				responseDefaults,
				isList
			})
		}
	}

	return routes
}

// ── Validator Parser ─────────────────────────────────────────────────────────

function parseValidators(source) {
	const schemas = {}

	// Find all exported const validators
	// Handles: export const Name = z.object({...}), createFindParams(...).extend({...}), etc.
	const exportRegex = /export\s+const\s+(\w+)\s*=\s*/g
	let match
	const exportPositions = []
	while ((match = exportRegex.exec(source)) !== null) {
		exportPositions.push({ name: match[1], start: match.index + match[0].length })
	}

	for (let i = 0; i < exportPositions.length; i++) {
		const { name, start } = exportPositions[i]

		// Skip type exports
		if (name.endsWith('Type')) continue

		const end = i + 1 < exportPositions.length ? exportPositions[i + 1].start : source.length
		const body = source.slice(start, end)

		const schema = parseZodExpression(body)
		if (schema) {
			schemas[name] = schema
		}
	}

	return schemas
}

function parseZodExpression(expr) {
	const properties = {}
	let isFindParams = false

	if (expr.includes('createFindParams')) {
		isFindParams = true
		// Extract default limit/offset
		const limitMatch = expr.match(/limit:\s*(\d+)/)
		const offsetMatch = expr.match(/offset:\s*(\d+)/)
		properties.limit = {
			type: 'integer',
			default: limitMatch ? parseInt(limitMatch[1]) : 20,
			_optional: true
		}
		properties.offset = {
			type: 'integer',
			default: offsetMatch ? parseInt(offsetMatch[1]) : 0,
			_optional: true
		}
		properties.order = { type: 'string', _optional: true }
		properties.fields = { type: 'string', _optional: true }
	}

	// Find the object shape — look for .extend({ or z.object({
	const objectBody = extractObjectBody(expr)
	if (objectBody) {
		const fields = parseObjectFields(objectBody)
		Object.assign(properties, fields)
	}

	if (Object.keys(properties).length === 0 && !isFindParams) {
		return null
	}

	const required = []
	for (const [key, value] of Object.entries(properties)) {
		if (!value._optional) {
			required.push(key)
		}
		delete value._optional
	}

	return {
		type: 'object',
		properties,
		...(required.length > 0 ? { required } : {})
	}
}

function extractObjectBody(expr) {
	// Find .extend({ or z.object({ and extract the balanced braces content
	const startPatterns = [/\.extend\(\s*\{/, /z\.object\(\s*\{/]
	for (const pattern of startPatterns) {
		const match = pattern.exec(expr)
		if (match) {
			const startIdx = match.index + match[0].length - 1 // position of opening {
			return extractBalanced(expr, startIdx, '{', '}')
		}
	}
	return null
}

function extractBalanced(str, start, open, close) {
	let depth = 0
	let i = start
	while (i < str.length) {
		if (str[i] === open) depth++
		else if (str[i] === close) {
			depth--
			if (depth === 0) return str.slice(start + 1, i)
		}
		i++
	}
	return null
}

function parseObjectFields(body) {
	const fields = {}
	// Match field definitions, handling multi-line chains and nested parens
	// Split by top-level commas followed by a word + colon pattern
	const lines = body.split(/,\s*(?=\w+\s*:)/s)
	for (const line of lines) {
		const fieldMatch = line.match(/^\s*(\w+)\s*:\s*([\s\S]+)$/s)
		if (!fieldMatch) continue
		const [, name, typeExpr] = fieldMatch
		fields[name] = parseZodType(typeExpr.trim())
	}
	return fields
}

function parseZodType(expr) {
	const isOptional = expr.includes('.optional()')
	const isNullable = expr.includes('.nullable()')
	const result = { _optional: isOptional }

	// Check compound types first (before primitive checks that would match inner types)
	if (expr.includes('z.array(')) {
		result.type = 'array'
		const innerMatch = expr.match(/z\.array\(\s*(z\.\w+(?:\([^)]*\))?(?:\.\w+(?:\([^)]*\))?)*)/)
		if (innerMatch) {
			const inner = parseZodType(innerMatch[1])
			delete inner._optional
			result.items = inner
		} else {
			result.items = { type: 'string' }
		}
		const minMatch = expr.match(/\.min\((\d+)/)
		if (minMatch) result.minItems = parseInt(minMatch[1])
	} else if (expr.includes('z.record(')) {
		result.type = 'object'
		result.additionalProperties = true
	} else if (expr.includes('z.preprocess(')) {
		result.type = 'string'
	} else if (expr.includes('z.enum(') && !expr.includes('z.nativeEnum(')) {
		result.type = 'string'
		const enumMatch = expr.match(/z\.enum\(\s*\[([^\]]+)\]/)
		if (enumMatch) {
			result.enum = enumMatch[1].match(/['"]([^'"]+)['"]/g)?.map(s => s.replace(/['"]/g, ''))
		}
	} else if (expr.includes('z.nativeEnum(')) {
		result.type = 'string'
	} else if (expr.includes('z.string(') || expr.includes('z.string()')) {
		result.type = 'string'
		const minMatch = expr.match(/\.min\((\d+)/)
		const maxMatch = expr.match(/\.max\((\d+)/)
		if (minMatch) result.minLength = parseInt(minMatch[1])
		if (maxMatch) result.maxLength = parseInt(maxMatch[1])
		const emailMatch = expr.includes('.email(')
		if (emailMatch) result.format = 'email'
	} else if (expr.includes('z.number(') || expr.includes('z.number()')) {
		result.type = 'number'
		const minMatch = expr.match(/\.min\((\d+)/)
		const maxMatch = expr.match(/\.max\((\d+)/)
		if (minMatch) result.minimum = parseInt(minMatch[1])
		if (maxMatch) result.maximum = parseInt(maxMatch[1])
	} else if (expr.includes('z.boolean(') || expr.includes('z.boolean()')) {
		result.type = 'boolean'
		const defaultMatch = expr.match(/\.default\((true|false)\)/)
		if (defaultMatch) result.default = defaultMatch[1] === 'true'
	} else {
		result.type = 'string'
	}

	if (isNullable) result.nullable = true

	const defaultMatch = expr.match(/\.default\(([^)]+)\)/)
	if (defaultMatch && !result.default) {
		const val = defaultMatch[1].trim()
		if (val === 'true' || val === 'false') result.default = val === 'true'
		else if (/^\d+$/.test(val)) result.default = parseInt(val)
		else result.default = val.replace(/['"]/g, '')
	}

	return result
}

// ── Response Schema Builder ──────────────────────────────────────────────────

function inferFieldType(fieldName) {
	if (fieldName === 'id') return 'string'
	if (fieldName.endsWith('_id')) return 'string'
	if (fieldName.endsWith('_at')) return { type: 'string', format: 'date-time' }
	if (fieldName === 'metadata') return { type: 'object', additionalProperties: true }
	if (
		fieldName === 'rating' ||
		fieldName === 'number' ||
		fieldName === 'count' ||
		fieldName === 'attempts'
	)
		return 'integer'
	if (fieldName === 'is_active' || fieldName === 'sent') return 'boolean'
	if (
		fieldName.endsWith('_count') ||
		fieldName === 'limit' ||
		fieldName === 'offset' ||
		fieldName === 'response_status'
	)
		return 'integer'
	// Nested fields like 'activity.*' — skip for now, just mark as present
	if (fieldName.includes('.*')) return { type: 'array', items: { type: 'object' } }
	return 'string'
}

function buildResourceProperties(defaults) {
	// Group fields by top-level key, collecting nested paths
	const topLevel = {} // field name -> true (scalar) or Map of sub-fields
	const wildcards = {} // field name -> true (has .* wildcard)

	for (const field of defaults) {
		const dotIdx = field.indexOf('.')
		if (dotIdx === -1) {
			// Top-level scalar field
			if (!topLevel[field]) topLevel[field] = true
			continue
		}

		const parent = field.slice(0, dotIdx)
		const rest = field.slice(dotIdx + 1)

		if (rest === '*') {
			wildcards[parent] = true
			continue
		}

		// Nested field — collect sub-fields
		if (topLevel[parent] === true) topLevel[parent] = []
		if (!Array.isArray(topLevel[parent])) topLevel[parent] = []
		topLevel[parent].push(rest)
	}

	const properties = {}
	for (const [key, value] of Object.entries(topLevel)) {
		if (value === true) {
			// Simple scalar
			const inferred = inferFieldType(key)
			properties[key] = typeof inferred === 'string' ? { type: inferred } : inferred
		} else {
			// Nested object — recurse to build its properties
			const nestedProps = buildResourceProperties(value)
			// Heuristic: if the key is plural, it's likely an array of objects
			const isArray =
				key.endsWith('s') &&
				!key.endsWith('ss') &&
				!key.endsWith('us') &&
				key !== 'address' &&
				key !== 'status'
			if (isArray) {
				properties[key] = { type: 'array', items: { type: 'object', properties: nestedProps } }
			} else {
				properties[key] = { type: 'object', properties: nestedProps }
			}
		}
	}

	// Add wildcard entries as generic object arrays
	for (const key of Object.keys(wildcards)) {
		if (!properties[key]) {
			const isArray = key.endsWith('s') && !key.endsWith('ss') && !key.endsWith('us')
			if (isArray) {
				properties[key] = { type: 'array', items: { type: 'object' } }
			} else {
				properties[key] = { type: 'object' }
			}
		}
	}

	return properties
}

function buildResponseSchema(path, method, responseDefaults, isList) {
	// DELETE responses with no query config
	if (method === 'delete' && !responseDefaults) {
		return {
			type: 'object',
			properties: {
				id: { type: 'string' },
				object: { type: 'string' },
				deleted: { type: 'boolean' }
			}
		}
	}

	// POST/PUT with body validator but no query config (create/update/action)
	if (!responseDefaults) {
		return { type: 'object' }
	}

	// Derive the resource name from the path for the response key
	const segments = path
		.split('/')
		.filter(s => s && !s.startsWith('{') && s !== 'admin' && s !== 'store')
	const resourceKey = segments[segments.length - 1] || 'data'

	const resourceProps = buildResourceProperties(responseDefaults)
	const resourceSchema = { type: 'object', properties: resourceProps }

	if (isList) {
		return {
			type: 'object',
			properties: {
				[resourceKey]: { type: 'array', items: resourceSchema },
				count: { type: 'integer' },
				limit: { type: 'integer' },
				offset: { type: 'integer' }
			}
		}
	}

	// Single resource — wrap in an object with the resource key
	return {
		type: 'object',
		properties: {
			[resourceKey.replace(/s$/, '')]: resourceSchema
		}
	}
}

// ── OpenAPI Generator ────────────────────────────────────────────────────────

function generateOpenAPI(pluginName, routes, schemas) {
	const paths = {}

	for (const route of routes) {
		const {
			path,
			method,
			queryValidator,
			bodyValidator,
			authenticated,
			responseDefaults,
			isList
		} = route
		if (!paths[path]) paths[path] = {}

		const operation = {
			operationId: buildOperationId(method, path),
			summary: buildSummary(method, path),
			tags: [buildTag(path)]
		}

		if (authenticated) {
			operation.security = [{ bearerAuth: [] }]
		}

		// Query parameters from validator
		if (queryValidator && schemas[queryValidator]) {
			const schema = schemas[queryValidator]
			operation.parameters = []
			for (const [name, prop] of Object.entries(schema.properties || {})) {
				const param = {
					name,
					in: 'query',
					required: schema.required?.includes(name) || false,
					schema: { ...prop }
				}
				delete param.schema._optional
				operation.parameters.push(param)
			}
		}

		// Path parameters
		const pathParams = path.match(/\{(\w+)\}/g)
		if (pathParams) {
			if (!operation.parameters) operation.parameters = []
			for (const param of pathParams) {
				const name = param.replace(/[{}]/g, '')
				// Don't duplicate if already in query params
				if (!operation.parameters.some(p => p.name === name)) {
					operation.parameters.push({
						name,
						in: 'path',
						required: true,
						schema: { type: 'string' }
					})
				}
			}
		}

		// Request body from validator
		if (bodyValidator && schemas[bodyValidator]) {
			const schema = { ...schemas[bodyValidator] }
			// Clean up _optional flags from properties
			if (schema.properties) {
				for (const prop of Object.values(schema.properties)) {
					delete prop._optional
				}
			}
			operation.requestBody = {
				required: true,
				content: {
					'application/json': { schema }
				}
			}
		}

		// Build response schema from defaults
		const responseSchema = buildResponseSchema(path, method, responseDefaults, isList)
		operation.responses = {
			200: {
				description: 'OK',
				content: {
					'application/json': { schema: responseSchema }
				}
			}
		}

		if (authenticated) {
			operation.responses[401] = { description: 'Unauthorized' }
		}

		paths[path][method] = operation
	}

	const { version, description: pkgDesc } = getPluginInfo(pluginName)

	const spec = {
		openapi: '3.1.0',
		info: {
			title: `${formatPluginName(pluginName)} API`,
			version,
			description:
				pkgDesc || `API reference for the ${formatPluginName(pluginName)} Medusa plugin.`
		},
		servers: [{ url: 'http://localhost:9000', description: 'Local development' }],
		paths
	}

	if (routes.some(r => r.authenticated)) {
		spec.components = {
			securitySchemes: {
				bearerAuth: {
					type: 'http',
					scheme: 'bearer'
				},
				cookieAuth: {
					type: 'apiKey',
					in: 'cookie',
					name: 'connect.sid'
				}
			}
		}
	}

	return spec
}

function buildOperationId(method, path) {
	const parts = path
		.replace(/^\//, '')
		.replace(/\{(\w+)\}/g, 'By$1')
		.split('/')
		.map(p => p.charAt(0).toUpperCase() + p.slice(1))
	const prefix = { get: 'get', post: 'post', delete: 'delete', put: 'put', patch: 'patch' }
	return (prefix[method] || method) + parts.join('')
}

function singularize(word) {
	if (word.endsWith('ies')) return word.slice(0, -3) + 'y'
	if (word.endsWith('ses') || word.endsWith('xes') || word.endsWith('zes'))
		return word.slice(0, -2)
	if (word.endsWith('s') && !word.endsWith('ss')) return word.slice(0, -1)
	return word
}

function buildSummary(method, path) {
	const segments = path.split('/').filter(Boolean)
	const lastSegment = segments[segments.length - 1]
	const lastIsParam = lastSegment.startsWith('{')

	// Get all non-parameter, non-scope segments
	const resourceSegments = segments.filter(
		p => !p.startsWith('{') && p !== 'admin' && p !== 'store'
	)
	const resource = resourceSegments[resourceSegments.length - 1] || ''
	const parentResource =
		resourceSegments.length > 1 ? resourceSegments[resourceSegments.length - 2] : ''

	const formatted = resource.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
	const singular = singularize(formatted)

	// Detect action routes: POST to a path where the last segment is a non-parameter
	// that looks like a verb (not a typical plural resource name) under a resource with an {id}
	// e.g., /admin/reviews/approve, /admin/reviews/reject
	const secondToLast = segments[segments.length - 2] || ''
	const isActionRoute =
		method === 'post' && !lastIsParam && secondToLast.startsWith('{')
			? false // nested create like /triggers/{id}/actions — this is a normal create
			: method === 'post' && !lastIsParam && parentResource && !lastSegment.endsWith('s')

	if (isActionRoute) {
		// Action route: "Approve Reviews", "Reject Reviews"
		const parentFormatted = singularize(
			parentResource.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
		)
		return `${formatted} ${parentFormatted}`
	}

	const verbs = {
		get: lastIsParam ? `Get ${singular}` : `List ${formatted}`,
		post: lastIsParam ? `Update ${singular}` : `Create ${singular}`,
		delete: lastIsParam ? `Delete ${singular}` : `Batch Delete ${formatted}`,
		put: `Replace ${singular}`,
		patch: `Patch ${singular}`
	}
	return verbs[method] || `${method.toUpperCase()} ${formatted}`
}

function buildTag(path) {
	const parts = path.replace(/^\//, '').split('/')
	const scope = parts[0] // admin or store
	return scope.charAt(0).toUpperCase() + scope.slice(1)
}

function formatPluginName(name) {
	return name.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}

function getPluginInfo(pluginName) {
	try {
		const pkg = JSON.parse(readFileSync(join(PACKAGES_DIR, pluginName, 'package.json'), 'utf-8'))
		return {
			version: pkg.version || '1.0.0',
			description: pkg.description || '',
			name: pkg.name || pluginName
		}
	} catch {
		return { version: '1.0.0', description: '', name: pluginName }
	}
}

// ── Sidebar Generation ───────────────────────────────────────────────────────

function slugify(str) {
	return str
		.toLowerCase()
		.replace(/[^\w]+/g, '-')
		.replace(/^-|-$/g, '')
}

function generateSidebarLinks(pluginName, spec, homepageSlug) {
	const basePath = `/${homepageSlug}/api/`
	const tagGroups = {}

	for (const [, methods] of Object.entries(spec.paths || {})) {
		for (const [, op] of Object.entries(methods)) {
			if (!op.operationId) continue
			const tag = (op.tags && op.tags[0]) || 'Operations'
			if (!tagGroups[tag]) tagGroups[tag] = []
			tagGroups[tag].push({
				label: op.summary || op.operationId,
				link: `${basePath}operations/${slugify(op.operationId)}/`
			})
		}
	}

	return Object.entries(tagGroups).map(([tag, items]) => ({
		label: tag,
		collapsed: true,
		items
	}))
}

// ── Main ─────────────────────────────────────────────────────────────────────

function main() {
	// Packages merged into other plugins — skip to avoid stale output
	const excludePackages = ['majel']

	const packages = readdirSync(PACKAGES_DIR, { withFileTypes: true })
		.filter(d => d.isDirectory() && !excludePackages.includes(d.name))
		.map(d => d.name)

	let generated = 0
	const sidebarData = {}

	// Map package directory names to docs site slugs
	const slugOverrides = {
		// majel: 'majel',
		// mildred: 'mildred'
	}

	for (const pkg of packages) {
		const middlewaresFile = join(PACKAGES_DIR, pkg, 'src/api/middlewares.ts')
		const middlewaresDir = join(PACKAGES_DIR, pkg, 'src/api/middlewares')
		const validatorsFile = join(PACKAGES_DIR, pkg, 'src/api/validators.ts')
		const validatorsDir = join(PACKAGES_DIR, pkg, 'src/api/validators')

		if (!existsSync(middlewaresFile)) continue

		console.log(`Processing ${pkg}...`)

		// Parse routes from main middlewares file and any split middleware files
		let routes = parseMiddlewares(readFileSync(middlewaresFile, 'utf-8'))
		if (existsSync(middlewaresDir)) {
			const files = readdirSync(middlewaresDir).filter(
				f => f.endsWith('.ts') && !f.startsWith('_')
			)
			for (const file of files) {
				routes.push(...parseMiddlewares(readFileSync(join(middlewaresDir, file), 'utf-8')))
			}
		}

		if (routes.length === 0) {
			console.log(`  No routes found, skipping.`)
			continue
		}

		let schemas = {}
		if (existsSync(validatorsFile)) {
			schemas = parseValidators(readFileSync(validatorsFile, 'utf-8'))
		} else if (existsSync(validatorsDir)) {
			// Read all .ts files in the validators directory
			const files = readdirSync(validatorsDir).filter(f => f.endsWith('.ts'))
			for (const file of files) {
				const fileSrc = readFileSync(join(validatorsDir, file), 'utf-8')
				Object.assign(schemas, parseValidators(fileSrc))
			}
		}

		const spec = generateOpenAPI(pkg, routes, schemas)
		const yaml = stringify(spec, { lineWidth: 120 })
		const outputPath = join(OUTPUT_DIR, `${pkg}.yaml`)
		writeFileSync(outputPath, yaml, 'utf-8')
		console.log(`  Generated ${outputPath} (${routes.length} routes)`)
		generated++

		// Determine the docs site slug for this package
		let homepageSlug = slugOverrides[pkg]
		if (!homepageSlug) {
			const pkgJson = JSON.parse(readFileSync(join(PACKAGES_DIR, pkg, 'package.json'), 'utf-8'))
			const homepage = pkgJson.homepage || ''
			homepageSlug = homepage.replace('https://pevey.com/', '')
		}
		if (homepageSlug) {
			sidebarData[homepageSlug] = generateSidebarLinks(pkg, spec, homepageSlug)
		}
	}

	// Write sidebar data
	const sidebarPath = join(OUTPUT_DIR, '_sidebar.json')
	writeFileSync(sidebarPath, JSON.stringify(sidebarData, null, '\t'), 'utf-8')
	console.log(`\nGenerated sidebar data at ${sidebarPath}`)

	// ── Sync README → overview pages ─────────────────────────────────────────
	const DOCS_DIR = resolve(import.meta.dirname, '../src/content/docs')

	// Map package dirs to docs slugs and display titles
	const readmeMappings = [
		{ dir: 'analytics', slug: 'medusa-plugin-analytics', title: 'Analytics' },
		{ dir: 'barcodes', slug: 'medusa-plugin-barcodes', title: 'Barcodes' },
		{ dir: 'complaints', slug: 'medusa-plugin-complaints', title: 'Complaints' },
		{ dir: 'content', slug: 'medusa-plugin-content', title: 'Content' },
		{ dir: 'customer-tags', slug: 'medusa-plugin-customer-tags', title: 'Customer Tags' },
		{ dir: 'file-r2', slug: 'medusa-plugin-r2', title: 'R2 File Storage' },
		{ dir: 'forms', slug: 'medusa-plugin-forms', title: 'Forms' },
		// { dir: 'majel', slug: 'majel', title: 'Majel' },
		// { dir: 'mildred', slug: 'mildred', title: 'Mildred' },
		{ dir: 'notification-ses', slug: 'medusa-plugin-ses', title: 'SES Notifications' },
		{ dir: 'order-notes', slug: 'medusa-plugin-order-notes', title: 'Order Notes' },
		{ dir: 'payment-braintree', slug: 'medusa-plugin-braintree', title: 'Braintree Payments' },
		{ dir: 'reviews', slug: 'medusa-plugin-ratings', title: 'Reviews' },
		{ dir: 'statistics', slug: 'medusa-plugin-statistics', title: 'Statistics' },
		{ dir: 'tax-lookup', slug: 'medusa-plugin-tax-lookup', title: 'Tax Lookup' },
		{ dir: 'tracing', slug: 'medusa-plugin-tracing', title: 'Tracing' },
		{ dir: 'veeqo', slug: 'medusa-plugin-veeqo', title: 'Veeqo' },
		{ dir: 'webhooks', slug: 'medusa-plugin-webhooks', title: 'Webhooks' }
	]

	let synced = 0
	for (const m of readmeMappings) {
		const readmePath = join(PACKAGES_DIR, m.dir, 'README.md')
		const pkgPath = join(PACKAGES_DIR, m.dir, 'package.json')
		if (!existsSync(pkgPath)) continue

		const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'))
		const desc = pkg.description || `${m.title} plugin for Medusa v2.`

		let body = ''
		if (existsSync(readmePath)) {
			body = readFileSync(readmePath, 'utf-8')
				.split('\n')
				.filter(
					line =>
						!line.match(/^#\s+/) &&
						!line.match(/^\[Documentation\]/) &&
						!line.includes('not familiar with Medusa')
				)
				.join('\n')
				.replace(/^\n+/, '')
				.replace(/\n{3,}/g, '\n\n')
		}
		if (!body.trim()) body = `${desc}\n`

		const mdx = `---\ntitle: ${m.title}\ndescription: ${desc}\nprev: false\n---\n\n${body}`
		const outDir = join(DOCS_DIR, m.slug)
		if (!existsSync(outDir)) mkdirSync(outDir, { recursive: true })
		writeFileSync(join(outDir, 'index.mdx'), mdx)
		synced++
	}
	// Sync SDK README (different structure — full README as single page, no boilerplate stripping)
	const sdkReadmePath = join(PACKAGES_DIR, 'js-sdk', 'README.md')
	if (existsSync(sdkReadmePath)) {
		const sdkReadme = readFileSync(sdkReadmePath, 'utf-8')
		const sdkBody = sdkReadme
			.split('\n')
			.filter(line => !line.match(/^#\s+@pevey/))
			.join('\n')
			.replace(/^\n+/, '')
			.replace(/\n{3,}/g, '\n\n')

		const sdkMdx = `---\ntitle: "@pevey/medusa"\ndescription: Extended Medusa JS SDK with custom plugin support\nprev: false\n---\n\n${sdkBody}`
		const sdkDir = join(DOCS_DIR, 'medusa-sdk')
		if (!existsSync(sdkDir)) mkdirSync(sdkDir, { recursive: true })
		writeFileSync(join(sdkDir, 'index.mdx'), sdkMdx)
		synced++
	}

	console.log(`Synced ${synced} README → overview pages`)

	console.log(`Done! Generated ${generated} OpenAPI specs.`)
}

main()
