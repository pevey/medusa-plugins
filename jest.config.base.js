const path = require('path')
const { loadEnv } = require('@medusajs/utils')
loadEnv('test', path.resolve(__dirname))

const base = {
	transform: {
		'^.+\\.[jt]sx?$': [
			'@swc/jest',
			{
				jsc: {
					parser: { syntax: 'typescript', tsx: true, decorators: true },
					transform: { decoratorMetadata: true }
				}
			}
		]
	},
	transformIgnorePatterns: [
		'node_modules/(?!(@react-email)/)'
	],
	testEnvironment: 'node',
	moduleFileExtensions: ['js', 'ts', 'json', 'tsx'],
	modulePathIgnorePatterns: ['dist/', '<rootDir>/.medusa/']
}

if (process.env.TEST_TYPE === 'integration:http') {
	base.testMatch = ['**/integration-tests/http/*.spec.[jt]s']
} else if (process.env.TEST_TYPE === 'integration:modules') {
	base.testMatch = ['**/src/modules/*/__tests__/**/*.[jt]s']
} else if (process.env.TEST_TYPE === 'unit') {
	base.testMatch = ['**/src/**/__tests__/**/*.unit.spec.[jt]s']
}

module.exports = base
