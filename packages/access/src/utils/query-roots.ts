import { MedusaModule } from '@medusajs/framework/modules-sdk'

const toSnake = (value: string) =>
	value
		.replace(/([a-z0-9])([A-Z])/g, '$1_$2')
		.replace(/[\s-]+/g, '_')
		.toLowerCase()

/**
 * One walk of the module joiner configs, serving both names an alias has:
 * the snake_case canonical entity the scope registry and row filters key on,
 * and the raw joiner `entity` string, which is the GraphQL type name the field
 * resolver needs to index into the schema's type map.
 *
 * Both used to be built separately — here and in the field filter — from the
 * same source with different normalization, which is two implementations free
 * to drift apart on a question with one right answer.
 */
type AliasIndex = {
	canonical: Map<string, string>
	graphqlType: Map<string, string>
	builtFrom: number
}

let aliasIndex: AliasIndex | undefined

function buildAliasIndex(configs: any[]): AliasIndex {
	const canonical = new Map<string, string>()
	const graphqlType = new Map<string, string>()

	for (const config of configs) {
		const entries = Array.isArray(config.alias) ? config.alias : config.alias ? [config.alias] : []
		for (const alias of entries) {
			const names = Array.isArray(alias.name) ? alias.name : [alias.name]
			const entity = alias.entity ?? names[0]
			const snake = toSnake(entity)
			for (const name of names) {
				canonical.set(name.toLowerCase(), snake)
				graphqlType.set(name.toLowerCase(), entity)
			}
			if (alias.entity) {
				canonical.set(alias.entity.toLowerCase(), snake)
				graphqlType.set(alias.entity.toLowerCase(), alias.entity)
			}
		}
	}

	return { canonical, graphqlType, builtFrom: configs.length }
}

/**
 * Rebuilt when the number of registered modules changes, so a module that
 * registers after the first lookup — or an HMR reload that adds one — does not
 * leave every later resolution answering from a stale map. A module count is a
 * coarse signal, but it is the one that catches late registration, which is the
 * case that actually happens.
 */
function index(): AliasIndex {
	const configs = MedusaModule.getAllJoinerConfigs() ?? []
	if (!aliasIndex || aliasIndex.builtFrom !== configs.length) {
		aliasIndex = buildAliasIndex(configs)
	}
	return aliasIndex
}

/** How many modules the joiner registry currently holds; the cache-invalidation signal. */
export function joinerConfigCount(): number {
	return (MedusaModule.getAllJoinerConfigs() ?? []).length
}

export function canonicalQueryRoot(name: string): string | undefined {
	const { canonical } = index()
	return canonical.get(name.toLowerCase()) ?? canonical.get(toSnake(name))
}

/** The GraphQL type name an alias resolves to, e.g. `customers` → `Customer`. */
export function graphqlTypeForAlias(name: string): string | undefined {
	const { graphqlType } = index()
	return graphqlType.get(name.toLowerCase()) ?? graphqlType.get(toSnake(name))
}

export function extractQueryRoots(arg: unknown): string[] | undefined {
	if (!arg || typeof arg !== 'object') return undefined
	const record = arg as Record<string, any>
	if ('__value' in record) {
		const value = record.__value
		if (!value || typeof value !== 'object') return undefined
		const direct = value.entryPoint ?? value.service ?? value.alias
		if (typeof direct === 'string') return [direct]
		const keys = Object.keys(value).filter(key => !key.startsWith('__'))
		return keys.length ? keys : undefined
	}
	if (typeof record.entity === 'string') return [record.entity]
	if (typeof record.entryPoint === 'string') return [record.entryPoint]
	if (typeof record.service === 'string') return [record.service]
	return undefined
}
