# Mildred

Privacy-focused customer analytics for Medusa v2.

[Documentation](https://pevey.com/mildred)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

## Installation

Inside your medusa backend root folder:

```bash
yarn add mildred
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'mildred',
			options: {}
		}
		// ... other plugins
	]
})
```

## Usage
