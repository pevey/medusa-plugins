import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises'
import { tmpdir } from 'os'
import { join } from 'path'
import { discoverPoliciesFromDir } from '../discover-policies'
import { policiesLoader } from '../policies-loader'

describe('discoverPoliciesFromDir (guards)', () => {
	it('is a no-op when given no path', async () => {
		await expect(discoverPoliciesFromDir(undefined)).resolves.toBeUndefined()
		await expect(policiesLoader(undefined)).resolves.toBeUndefined()
	})

	it('does not throw and imports nothing when there is no access-policies dir', async () => {
		const root = await mkdtemp(join(tmpdir(), 'access-discover-'))
		try {
			// sibling dir named "policies" must be IGNORED (only "access-policies" is scanned)
			await mkdir(join(root, 'policies'), { recursive: true })
			await writeFile(join(root, 'policies', 'should-not-import.ts'), "throw new Error('this file must never be imported')\n")

			await expect(discoverPoliciesFromDir(root)).resolves.toBeUndefined()
		} finally {
			await rm(root, { recursive: true, force: true })
		}
	})
})
