import { configForLocale, LOCALE_CONFIG_MAP, SIMPLE } from '../lib/text-search-config'

describe('configForLocale', () => {
	it('maps BCP-47 primary subtag to a Postgres config', () => {
		expect(configForLocale('es-ES')).toBe('spanish')
		expect(configForLocale('fr-FR')).toBe('french')
		expect(configForLocale('en-US')).toBe('english')
	})
	it('accepts a bare subtag', () => {
		expect(configForLocale('de')).toBe('german')
	})
	it('falls back to simple for unknown languages', () => {
		expect(configForLocale('ja-JP')).toBe(SIMPLE)
		expect(configForLocale('')).toBe(SIMPLE)
	})
	it('honors an overrides map (full locale wins over subtag)', () => {
		expect(configForLocale('pt-BR', { 'pt-BR': 'portuguese' })).toBe('portuguese')
		expect(configForLocale('es-MX', { es: 'spanish' })).toBe('spanish')
	})
	it('exposes the base map', () => {
		expect(LOCALE_CONFIG_MAP.en).toBe('english')
	})
})
