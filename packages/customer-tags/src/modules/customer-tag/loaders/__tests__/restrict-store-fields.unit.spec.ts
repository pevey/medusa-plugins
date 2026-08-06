/// <reference types="jest" />

const resetRegistry = () => {
	;(global as any).AccessRestrictedFields = new Map()
}

const registeredForStore = (): Set<string> | undefined => (global as any).AccessRestrictedFields?.get('/store')

// The loader imports the access package lazily, at call time — so a static
// import of the loader here still lets per-test `jest.doMock` of the package
// specifier take effect (after `jest.resetModules`).
import restrictStoreFields from '../restrict-store-fields'

describe('restrictStoreFields loader', () => {
	beforeEach(() => {
		jest.resetModules()
		resetRegistry()
	})

	it('declares the tag relations restricted on /store by default', async () => {
		await restrictStoreFields({ options: undefined } as any)

		expect(registeredForStore()).toEqual(new Set(['customer_tag', 'customer_tags']))
	})

	it('declares nothing when adminOnly is false', async () => {
		await restrictStoreFields({ options: { adminOnly: false } } as any)

		expect(registeredForStore()).toBeUndefined()
	})

	it('is a silent no-op by default when the access plugin is absent', async () => {
		jest.doMock('medusa-plugin-access/field-restrictions', () => {
			throw new Error('Cannot find module')
		})
		const warn = jest.fn()

		await expect(restrictStoreFields({ options: undefined, logger: { warn } } as any)).resolves.toBeUndefined()

		expect(registeredForStore()).toBeUndefined()
		expect(warn).not.toHaveBeenCalled()
	})

	it('warns when adminOnly was set explicitly but the access plugin is absent', async () => {
		jest.doMock('medusa-plugin-access/field-restrictions', () => {
			throw new Error('Cannot find module')
		})
		const warn = jest.fn()

		await expect(restrictStoreFields({ options: { adminOnly: true }, logger: { warn } } as any)).resolves.toBeUndefined()

		expect(registeredForStore()).toBeUndefined()
		expect(warn).toHaveBeenCalledWith(expect.stringContaining('NOT hidden from store responses'))
	})
})
