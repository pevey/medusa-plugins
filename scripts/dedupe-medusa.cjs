/**
 * Removes nested @medusajs/* packages from apps/backend/node_modules
 * that are already hoisted to the root node_modules.
 *
 * This prevents duplicate workflow registration errors caused by
 * Node.js loading the same package from two different paths.
 */
const fs = require('fs')
const path = require('path')

const root = path.resolve(__dirname, '..')
const nestedDir = path.join(root, 'apps', 'backend', 'node_modules', '@medusajs')
const hoistedDir = path.join(root, 'node_modules', '@medusajs')

if (!fs.existsSync(nestedDir)) process.exit(0)

const nested = fs.readdirSync(nestedDir)
let removed = 0

for (const pkg of nested) {
	const hoistedPkg = path.join(hoistedDir, pkg, 'package.json')
	const nestedPkg = path.join(nestedDir, pkg, 'package.json')

	if (!fs.existsSync(hoistedPkg) || !fs.existsSync(nestedPkg)) continue

	const hoistedVersion = JSON.parse(fs.readFileSync(hoistedPkg, 'utf-8')).version
	const nestedVersion = JSON.parse(fs.readFileSync(nestedPkg, 'utf-8')).version

	if (hoistedVersion === nestedVersion) {
		fs.rmSync(path.join(nestedDir, pkg), { recursive: true, force: true })
		removed++
	}
}

if (removed > 0) {
	try {
		const remaining = fs.readdirSync(nestedDir)
		if (remaining.length === 0) fs.rmdirSync(nestedDir)
	} catch {}
	console.log(`dedupe-medusa: removed ${removed} duplicate @medusajs packages from apps/backend/node_modules`)
}
