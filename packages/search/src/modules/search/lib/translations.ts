// Helpers for the optional Medusa Translation module (experimental, feature-flag gated).
// All of these degrade to "no translations" when the module is absent, so the base path
// is unaffected for stores that never enable translations.

import type { SearchSource } from './types'

export function resolveTranslationModule(container: any): any | null {
	try {
		const mod = container.resolve('translation', { allowUnregistered: true })
		return mod ?? null
	} catch {
		return null
	}
}

// True when the given Translation `reference` (table name) has any translatable fields.
export async function isSourceTranslatable(mod: any, reference: string): Promise<boolean> {
	if (!mod?.getTranslatableFields) return false
	try {
		const fields = await mod.getTranslatableFields(reference)
		if (!fields) return false
		const list = fields[reference]
		if (Array.isArray(list)) return list.length > 0
		if (Array.isArray(fields)) return fields.length > 0
		return Object.keys(fields).length > 0
	} catch {
		return false
	}
}

// The exact locales that have a real translation row for one entity (the targeted fan-out set).
export async function translatableLocalesForEntity(mod: any, reference: string, id: string): Promise<string[]> {
	if (!mod?.listTranslations) return []
	try {
		const rows = await mod.listTranslations({ reference, reference_id: id })
		return [...new Set((rows ?? []).map((r: any) => r.locale_code).filter(Boolean))] as string[]
	} catch {
		return []
	}
}

// Emit one search_document_translation row per locale that actually has a translation (merged
// projection via query.graph({ locale })), then prune locales that no longer have one. Callers
// must have already confirmed the module is present and the source is translatable.
export async function fanOutTranslations(
	query: any,
	search: any,
	source: SearchSource,
	mod: any,
	reference: string,
	id: string,
	baseId: string
): Promise<void> {
	const locales = await translatableLocalesForEntity(mod, reference, id)
	for (const locale of locales) {
		// `{ locale }` (second arg) substitutes translated values into the normal field names.
		const { data } = await (query.graph as any)(
			{ entity: source.entity, fields: source.fields, filters: { id } },
			{ locale }
		)
		const lrow = data[0]
		if (!lrow) continue
		const ldoc = source.buildDocument(lrow)
		await search.upsertTranslation({
			search_document_id: baseId,
			locale,
			title: ldoc.title,
			snippet: ldoc.snippet,
			primary_text: ldoc.primary_text,
			body_text: ldoc.body_text ?? null
		})
	}
	await search.pruneTranslations(baseId, locales)
}
