import { GraphQLUtils, promiseAll, toSnakeCase } from '@medusajs/framework/utils'
import { MedusaModule } from '@medusajs/framework/modules-sdk'
import type { MedusaContainer } from '@medusajs/framework/types'
import { authorize } from './has-permission'
import { PolicyDefinition, PolicyResource } from './define-policies'
import { graphqlTypeForAlias, joinerConfigCount } from './query-roots'

export interface ParsedFields {
	fields: Set<string>
	starFields: Set<string>
}

export interface FieldFilterContext {
	entity: string
	parsedFields: ParsedFields
}

export interface IFieldFilter {
	resolveFieldAccess(context: FieldFilterContext): Promise<FieldAccess>
}

/** A kept path whose read grant is held only within a scope. */
export type ScopedFieldPath = {
	/** Path as the caller wrote it, relative to the query root. */
	path: string
	resource: string
	scopes: string[]
}

export type FieldAccess = {
	/** Paths to drop outright — no read grant at all. */
	notAllowed: string[]
	/** Paths kept, but whose rows still need narrowing to the actor's scopes. */
	scoped: ScopedFieldPath[]
}

/**
 * Base GraphQL schema with common scalars
 */
const baseGraphqlSchema = `
    scalar DateTime
    scalar Date
    scalar Time
    scalar JSON
`

const primitiveTypes = new Set(['String', 'Int', 'Float', 'Boolean', 'ID', 'DateTime', 'JSON'])

// Parsing the joiner schemas is expensive, so both derived structures are
// cached — keyed on the module count, so a module registering after the first
// lookup rebuilds them instead of resolving forever against a stale schema.
let cachedSchema: GraphQLUtils.GraphQLSchema | null = null
let cachedEntityMap: Map<string, EntityMapping> | null = null
let cachedBuiltFrom = -1

function invalidateStaleCaches(): void {
	const count = joinerConfigCount()
	if (cachedBuiltFrom === count) {
		return
	}
	cachedBuiltFrom = count
	cachedSchema = null
	cachedEntityMap = null
}

interface EntityMapping {
	entityName: string
	targetEntity: string
	path: string[]
}

interface PathInfo {
	path: string
	entityName: string | null
}

function isString(value: any): value is string {
	return typeof value === 'string'
}

/**
 * Makes a GraphQL schema executable
 */
function makeSchemaExecutable(inputSchema: string) {
	const { schema: cleanedSchema } = GraphQLUtils.cleanGraphQLSchema(inputSchema)

	if (!cleanedSchema) {
		return
	}

	return GraphQLUtils.makeExecutableSchema({
		typeDefs: cleanedSchema
	})
}

function getExecutableSchema(): GraphQLUtils.GraphQLSchema | null {
	if (cachedSchema) {
		return cachedSchema
	}

	cachedSchema = buildExecutableSchema()
	return cachedSchema
}

/**
 * Builds entity alias map from joiner configs
 * Maps all possible aliases (e.g., "variant", "variants") to canonical entity names (e.g., "ProductVariant")
 */
function getSchemaFromJoinerConfigs(moduleJoinerConfigs: any[]): string {
	const schemaParts: string[] = []

	for (const config of moduleJoinerConfigs) {
		if (!config?.schema) {
			continue
		}

		schemaParts.push(config.schema)
	}

	return schemaParts.join('\n')
}

function buildCompleteEntityMap(): Map<string, EntityMapping> {
	const moduleJoinerConfigs = MedusaModule.getAllJoinerConfigs()
	const entityMap = new Map<string, EntityMapping>()

	// base GraphQL schema
	const schema = buildExecutableSchema()
	if (!schema) {
		return entityMap
	}

	const entitiesMap = schema.getTypeMap()

	// Process each service configuration to build alias field mappings
	for (const config of moduleJoinerConfigs) {
		processServiceConfig(config, entitiesMap, entityMap)
	}

	return entityMap
}

/**
 * Processes a service configuration to extract field mappings
 */
function processServiceConfig(config: any, entitiesMap: Record<string, any>, entityMap: Map<string, EntityMapping>): void {
	if (!config.extends) {
		return
	}

	for (const extend of config.extends) {
		if (!entitiesMap[extend?.entity]) {
			continue
		}

		const extendedFieldAlias = extend.fieldAlias || {}
		if (Object.keys(extendedFieldAlias).length > 0) {
			processFieldAliases(extendedFieldAlias, extend.entity, entitiesMap, entityMap)
		}
	}
}

/**
 * Processes field aliases to build entity mappings
 */
function processFieldAliases(
	fieldAlias: Record<string, any>,
	baseEntity: string,
	entitiesMap: Record<string, any>,
	entityMap: Map<string, EntityMapping>
): void {
	for (const [aliasName, aliasConfig] of Object.entries(fieldAlias)) {
		const aliasPath = isString(aliasConfig) ? aliasConfig : aliasConfig.path

		if (!aliasPath) {
			continue
		}

		// Build the complete path from base entity through alias path
		const pathSegments = aliasPath.split('.')
		let currentEntity = baseEntity
		let finalEntity = baseEntity
		let isValidPath = true

		// Traverse the path to find the final entity
		for (const segment of pathSegments) {
			const entityMapping = findFieldInEntity(currentEntity, segment, entitiesMap)

			if (!entityMapping) {
				isValidPath = false
				break
			}

			currentEntity = entityMapping.targetEntity
			finalEntity = entityMapping.targetEntity
		}

		if (isValidPath) {
			const fullPath = `${baseEntity}.${aliasName}`

			entityMap.set(fullPath, {
				entityName: aliasName,
				targetEntity: finalEntity,
				path: pathSegments
			})
		}
	}
}

/**
 * Finds a field in an entity and returns its target entity
 */
function findFieldInEntity(entityName: string, fieldName: string, entitiesMap: Record<string, any>): { targetEntity: string } | null {
	const entity = entitiesMap[entityName] as any

	if (!entity?.astNode?.fields) {
		return null
	}

	for (const field of entity.astNode.fields) {
		if (field.name?.value === fieldName) {
			let type = field.type

			while (type.type) {
				type = type.type
			}

			const targetEntity = type.name?.value
			if (targetEntity && !primitiveTypes.has(targetEntity)) {
				return { targetEntity }
			}
		}
	}

	return null
}

/**
 * Gets the complete entity map with all aliases resolved
 */
function getEntityMap(): Map<string, EntityMapping> {
	if (!cachedEntityMap) {
		cachedEntityMap = buildCompleteEntityMap()
	}
	return cachedEntityMap
}

/**
 * Builds executable schema from all joiner configs
 */
function buildExecutableSchema(): GraphQLUtils.GraphQLSchema | null {
	const moduleJoinerConfigs = MedusaModule.getAllJoinerConfigs()

	const schemaFromJoinerConfigs = getSchemaFromJoinerConfigs(moduleJoinerConfigs)

	const augmentedSchema = baseGraphqlSchema + '\n' + schemaFromJoinerConfigs
	const executableSchema = makeSchemaExecutable(augmentedSchema)

	return executableSchema || null
}

/**
 * Gets the actual GraphQL entity name from a field path using the complete entity map
 * This now uses the pre-built entity map with all aliases resolved
 * e.g., "product.variants.prices" -> "Price" (from resolved alias path)
 */
function getActualEntityName(fieldPath: string): string | null {
	invalidateStaleCaches()

	const schema = getExecutableSchema()

	if (!schema) {
		return null
	}

	const entitiesMap = schema.getTypeMap()
	const entityMap = getEntityMap()
	const parts = fieldPath.split('.')

	const entryPoint = parts[0]!
	const resolvedEntityName = graphqlTypeForAlias(entryPoint)

	if (!resolvedEntityName) {
		return null
	}

	let currentEntity = entitiesMap[resolvedEntityName] as any
	let currentEntityName = resolvedEntityName

	if (!currentEntity) {
		return null
	}

	for (let i = 1; i < parts.length; i++) {
		const fieldName = parts[i]

		const mappingKey = `${currentEntityName}.${fieldName}`
		const entityMapping = entityMap.get(mappingKey)

		if (entityMapping) {
			// field alias paths
			const targetEntityName = entityMapping.targetEntity
			currentEntityName = targetEntityName
			currentEntity = entitiesMap[currentEntityName] as any

			if (!currentEntity) {
				return null
			}
		} else {
			const fieldResult = findFieldInEntity(currentEntityName, fieldName, entitiesMap)

			if (!fieldResult) {
				return null
			}

			currentEntityName = fieldResult.targetEntity
			currentEntity = entitiesMap[currentEntityName] as any

			if (!currentEntity) {
				return null
			}
		}
	}

	return currentEntityName
}

/**
 * Gets the normalized snake_case entity name for policy comparison
 * e.g., "product.variants" -> "product_variant", "Price" -> "price"
 */
function getNormalizedEntityName(fieldPath: string): string | null {
	const actualEntityName = getActualEntityName(fieldPath)
	if (!actualEntityName) {
		return null
	}

	return toSnakeCase(actualEntityName)
}

/**
 * Collects all unique entity paths that need permission checks
 * This avoids duplicate permission checks for shared path prefixes
 */
function collectUniqueEntityPaths(entity: string, fields: string[]): Map<string, PathInfo> {
	const uniquePaths = new Map<string, PathInfo>()

	for (const field of fields) {
		const fullFieldPath = entity + '.' + field
		const pathSegments = fullFieldPath.split('.')

		// Build paths incrementally using string concatenation (more efficient than slice + join)
		let currentPath = ''
		for (let i = 0; i < pathSegments.length; i++) {
			currentPath = i === 0 ? pathSegments[i] : currentPath + '.' + pathSegments[i]

			if (!uniquePaths.has(currentPath)) {
				const entityName = getNormalizedEntityName(currentPath)
				uniquePaths.set(currentPath, { path: currentPath, entityName })
			}
		}
	}

	return uniquePaths
}

/**
 * Decides which of a query's requested field paths the actor may not read.
 *
 * Exists to close the link-expansion bypass: the route guard gates routes, but
 * `fields=` lets one route reach other entities, so `GET /admin/customers?
 * fields=orders.*` would read orders while holding only `customer:read`.
 *
 * Entity grain only. A path is checked only when it resolves to a registered
 * policy resource, so scalar columns are never gated — column-level control is
 * deliberately out of scope.
 */
export class AccessFieldFilter implements IFieldFilter {
	private policies: PolicyDefinition[]
	private userRoles: string[]
	private container: MedusaContainer

	constructor({ policies, userRoles, container }: { policies: PolicyDefinition[]; userRoles: string[]; container: MedusaContainer }) {
		this.policies = policies
		this.userRoles = userRoles
		this.container = container
	}

	/**
	 * Returns the requested field paths to drop, as the caller wrote them
	 * (relative to `entity`), so an empty array means everything is readable.
	 *
	 * Two callers, on either side of the query:
	 *  - `installFieldFilter` (access-guard) strips them from the response body;
	 *  - `makeFieldPruner` (access-guard) removes them from the selection before
	 *    the query runs, so the data is never fetched.
	 */
	async resolveFieldAccess(context: FieldFilterContext): Promise<FieldAccess> {
		const { entity, parsedFields } = context
		const { fields, starFields } = parsedFields
		const fieldsToCheck = [...fields, ...Array.from(starFields)]

		if (!fieldsToCheck.length || !this.policies.length || !entity) {
			return { notAllowed: [], scoped: [] }
		}

		const uniquePaths = collectUniqueEntityPaths(entity, fieldsToCheck)

		const pathsNeedingCheck: { path: string; entityName: string }[] = []
		for (const [path, info] of uniquePaths) {
			if (info.entityName && PolicyResource[info.entityName]) {
				pathsNeedingCheck.push({ path, entityName: info.entityName })
			}
		}

		// `authorize`, not `hasPermission`. The strict boolean reports `false` for a
		// grant held only at a scope, which is right for a caller that would
		// otherwise hand a scoped actor unnarrowed rows — and wrong here. This
		// decides whether a field path survives, not which rows come back, so a
		// scoped `order:read` is read access to orders and the branch stays.
		const permissionResults = await promiseAll(
			pathsNeedingCheck.map(async ({ path, entityName }) => {
				const decision = await authorize({
					roles: this.userRoles,
					actions: { resource: entityName, operation: 'read' },
					container: this.container
				})
				if (!decision.granted) {
					return { path, entityName, hasAccess: false, scopes: [] as string[] }
				}
				return {
					path,
					entityName,
					hasAccess: true,
					scopes: decision.scopes.filter(scope => scope.resource === entityName).map(scope => scope.scope)
				}
			})
		)

		const accessMap = new Map<string, boolean>()
		const scopeMap = new Map<string, { resource: string; scopes: string[] }>()
		for (const result of permissionResults) {
			accessMap.set(result.path, result.hasAccess)
			if (result.hasAccess && result.scopes.length) {
				scopeMap.set(result.path, { resource: result.entityName, scopes: result.scopes })
			}
		}

		const notAllowed: string[] = []
		const scoped: ScopedFieldPath[] = []

		for (const field of fieldsToCheck) {
			const fullFieldPath = entity + '.' + field
			const pathSegments = fullFieldPath.split('.')

			let currentPath = ''
			let fieldAllowed = true
			let narrowing: { resource: string; scopes: string[] } | undefined
			let narrowingPath = ''

			for (let i = 0; i < pathSegments.length; i++) {
				currentPath = i === 0 ? pathSegments[i] : currentPath + '.' + pathSegments[i]

				if (accessMap.has(currentPath) && !accessMap.get(currentPath)) {
					fieldAllowed = false
					break
				}
				// The outermost scoped ancestor wins: narrowing `orders` already
				// decides which `orders.items` come back with it.
				if (!narrowing && scopeMap.has(currentPath) && currentPath !== entity) {
					narrowing = scopeMap.get(currentPath)
					narrowingPath = currentPath.slice(entity.length + 1)
				}
			}

			if (!fieldAllowed) {
				notAllowed.push(field)
				continue
			}
			if (narrowing && !scoped.some(entry => entry.path === narrowingPath)) {
				scoped.push({ path: narrowingPath, resource: narrowing.resource, scopes: narrowing.scopes })
			}
		}

		return { notAllowed, scoped }
	}

	/** Just the paths to drop, for callers with no rows to narrow. */
	async getNotAllowedFields(context: FieldFilterContext): Promise<string[]> {
		return (await this.resolveFieldAccess(context)).notAllowed
	}
}
