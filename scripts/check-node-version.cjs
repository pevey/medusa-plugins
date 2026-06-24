#!/usr/bin/env node

const major = Number.parseInt(process.versions.node.split('.')[0], 10)

if (Number.isNaN(major) || major < 20 || major >= 25) {
	console.error('')
	console.error('Error: Unsupported Node.js version for this plugin build.')
	console.error(`Detected: ${process.version}`)
	console.error('Required: an LTS release in the range >=20 <25 (Node 20, 22, or 24)')
	console.error('')
	console.error('Switch to a supported LTS and run one of these commands:')
	console.error('nvm use 22 && yarn build')
	console.error('nvm use 24 && yarn build')
	console.error('')
	process.exit(1)
}
