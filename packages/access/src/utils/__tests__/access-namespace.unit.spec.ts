/// <reference types="jest" />
import { accessNamespaceActorTypes, accessNamespaceCorsOverride, configureAccessNamespace } from '../access-namespace'

const resetConfig = () => {
	;(global as any).AccessNamespaceConfig = { actorTypes: new Set(['user']) }
}

describe('configureAccessNamespace', () => {
	beforeEach(resetConfig)

	it('allows only the user actor type by default, with no cors override', () => {
		expect(accessNamespaceActorTypes()).toEqual(['user'])
		expect(accessNamespaceCorsOverride()).toBeUndefined()
	})

	it('adds actor types without removing the default', () => {
		configureAccessNamespace({ actorTypes: ['customer', 'affiliate'] })

		expect(accessNamespaceActorTypes().sort()).toEqual(['affiliate', 'customer', 'user'])
	})

	it('unions repeated configuration calls', () => {
		configureAccessNamespace({ actorTypes: ['customer'] })
		configureAccessNamespace({ actorTypes: ['customer', 'affiliate'] })

		expect(accessNamespaceActorTypes().sort()).toEqual(['affiliate', 'customer', 'user'])
	})

	it('ignores empty actor type entries', () => {
		configureAccessNamespace({ actorTypes: ['', 'customer'] })

		expect(accessNamespaceActorTypes().sort()).toEqual(['customer', 'user'])
	})

	it('stores and replaces the cors override, independent of actor types', () => {
		configureAccessNamespace({ cors: 'https://portal.example.com' })
		expect(accessNamespaceCorsOverride()).toBe('https://portal.example.com')
		expect(accessNamespaceActorTypes()).toEqual(['user'])

		configureAccessNamespace({ cors: 'https://other.example.com' })
		expect(accessNamespaceCorsOverride()).toBe('https://other.example.com')
	})
})
