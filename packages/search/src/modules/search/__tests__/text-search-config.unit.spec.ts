/// <reference types="jest" />
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
	// `locale` comes straight off the store request, so inherited object keys must not resolve —
	// they would return a non-string that later gets bound as a ::regconfig and errors at query time.
	it('ignores inherited keys on both the overrides map and the base map', () => {
		for (const key of ['constructor', '__proto__', 'toString', 'valueOf', 'hasOwnProperty']) {
			expect(configForLocale(key)).toBe(SIMPLE)
			expect(configForLocale(key, { es: 'spanish' })).toBe(SIMPLE)
			expect(configForLocale(`${key}-XX`, { es: 'spanish' })).toBe(SIMPLE)
		}
	})
	it('exposes the base map', () => {
		expect(LOCALE_CONFIG_MAP.en).toBe('english')
	})
})
