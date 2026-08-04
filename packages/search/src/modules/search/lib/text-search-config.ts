export const SIMPLE = 'simple'

// BCP-47 primary subtag -> Postgres built-in text-search config (Snowball stemmers).
export const LOCALE_CONFIG_MAP: Record<string, string> = {
	ar: 'arabic',
	hy: 'armenian',
	eu: 'basque',
	ca: 'catalan',
	da: 'danish',
	nl: 'dutch',
	en: 'english',
	fi: 'finnish',
	fr: 'french',
	de: 'german',
	el: 'greek',
	hi: 'hindi',
	hu: 'hungarian',
	id: 'indonesian',
	ga: 'irish',
	it: 'italian',
	lt: 'lithuanian',
	ne: 'nepali',
	no: 'norwegian',
	pt: 'portuguese',
	ro: 'romanian',
	ru: 'russian',
	sr: 'serbian',
	es: 'spanish',
	sv: 'swedish',
	ta: 'tamil',
	tr: 'turkish',
	yi: 'yiddish'
}

// `locale` is request-controlled, so every lookup here must be an own-property check. A plain
// `overrides[locale]` would resolve inherited keys — 'constructor' and '__proto__' both return
// truthy non-strings that would flow on as a regconfig and error at query time.
const own = (obj: Record<string, string>, key: string): string | undefined =>
	Object.prototype.hasOwnProperty.call(obj, key) ? obj[key] : undefined

// Resolve a BCP-47 locale (e.g. 'es-ES') to a Postgres text-search config name. A full-locale
// override wins, then a subtag override, then the built-in subtag map, else 'simple'.
export function configForLocale(locale: string, overrides: Record<string, string> = {}): string {
	if (!locale) return SIMPLE
	const full = own(overrides, locale)
	if (full) return full
	const subtag = locale.split('-')[0].toLowerCase()
	return own(overrides, subtag) ?? own(LOCALE_CONFIG_MAP, subtag) ?? SIMPLE
}
