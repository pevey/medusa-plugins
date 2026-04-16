#!/usr/bin/env node

const major = Number.parseInt(process.versions.node.split('.')[0], 10)

if (Number.isNaN(major) || major < 20 || major >= 25) {
	console.error('')
	console.error('Error: Unsupported Node.js version for this plugin build.')
	console.error(`Detected: ${process.version}`)
	console.error('Required: >=20 <25')
	console.error('')
	console.error('Use Node 20 and run one of these commands:')
	console.error('nvm use 20 && yarn build')
	console.error('npx -y node@20 ./node_modules/.bin/medusa plugin:build')
	console.error('')
	process.exit(1)
}
