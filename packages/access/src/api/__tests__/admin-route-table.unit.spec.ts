import { readFileSync } from 'node:fs'
import { join } from 'node:path'

/**
 * Lives here, not beside the admin tests it checks, for two reasons that point the
 * same way: the admin suite runs in chromium, where `node:fs` does not exist, and
 * `tsconfig.admin.json` is the only project covering `src/admin` — it carries
 * vitest types, not jest. That browser environment is also the constraint that
 * stops the harness importing the real middlewares in the first place, so the
 * check that the two agree has to live on the node side.
 *
 * The admin harness cannot import the real `middlewares.ts` files — they pull the
 * utils barrel and the guard, which are server-side — so `setup.ts` restates
 * their route table by hand. Its own comment says as much, and nothing checked
 * the two against each other: a route added to a middlewares file and forgotten
 * in the harness silently loses its contract coverage, which is the failure the
 * contract tests exist to prevent.
 *
 * Parsing rather than importing is the price of that constraint. It is narrow —
 * `matcher` and `method` string literals — and it fails loudly rather than
 * vacuously if the shape ever changes, because an empty parse is indistinguishable
 * from a clean result otherwise.
 */
const SRC = join(__dirname, '../..')

const MIDDLEWARES = [
	'api/admin/access/roles/middlewares.ts',
	'api/admin/access/policies/middlewares.ts',
	'api/admin/users/[id]/access/roles/middlewares.ts'
]

/**
 * Routes the admin UI calls that this plugin does not declare — Medusa core owns
 * them. Listed explicitly so an accidental addition to the harness is a failure
 * rather than an unnoticed extra.
 */
const NOT_OWNED_BY_THIS_PLUGIN = ['GET /admin/users']

const routeKeys = (source: string): string[] => {
	const keys: string[] = []
	// Entries are object literals in an array; splitting on the entry boundary
	// keeps `method` and `matcher` together whichever order they are written in.
	for (const entry of source.split(/\n\t\{/)) {
		const matcher = entry.match(/matcher:\s*'([^']+)'/)
		if (!matcher) {
			continue
		}
		const methods = entry.match(/methods?:\s*\[([^\]]*)\]/)
		const verbs = methods ? [...methods[1].matchAll(/'([A-Z]+)'/g)].map(match => match[1]) : ['*']
		for (const verb of verbs) {
			keys.push(`${verb} ${matcher[1]}`)
		}
	}
	return keys
}

const read = (relative: string) => readFileSync(join(SRC, relative), 'utf8')

describe('admin harness route table tracks the real middlewares', () => {
	const declared = MIDDLEWARES.flatMap(file => routeKeys(read(file)))
	const harness = routeKeys(read('admin/__tests__/setup.ts'))

	it('parses both sides, so an empty comparison cannot pass for a clean one', () => {
		expect(declared.length).toBeGreaterThan(15)
		expect(harness.length).toBeGreaterThan(15)
	})

	it('covers every route the plugin actually declares', () => {
		// The direction that matters: a route added to a middlewares file and not to
		// the harness has no contract test, and nothing else would say so.
		const missing = declared.filter(key => !harness.includes(key))

		expect(missing).toEqual([])
	})

	it('declares nothing the plugin does not own, beyond the listed core routes', () => {
		const extra = harness.filter(key => !declared.includes(key) && !NOT_OWNED_BY_THIS_PLUGIN.includes(key))

		// A harness entry matching no real route is either a route that was removed
		// and left behind, or a typo whose contract is being checked against nothing.
		expect(extra).toEqual([])
	})
})
