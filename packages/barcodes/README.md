# medusa-plugin-barcodes

Barcode generation and management plugin for Medusa v2. Generate and store barcodes for inventory items with GS1 DataMatrix support.

[Documentation](https://pevey.com/medusa-plugin-barcodes)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Barcode CRUD with URL and metadata storage
- On-the-fly barcode image generation (PNG) via admin API
- GS1 DataMatrix support with GTIN and serial number encoding
- Configurable barcode type, dimensions, and rendering options
- Powered by bwip-js for high-quality barcode rendering

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-barcodes
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your `medusa-config.ts` file. Example:

```ts
module.exports = defineConfig({
	//... other config
	plugins: [
		{
			resolve: 'medusa-plugin-barcodes',
			options: {}
		}
		// ... other plugins
	]
})
```

## Usage

- Manage barcodes via the admin API at `/admin/barcodes`.
- Generate barcode images via `GET /admin/barcode-generator` with query parameters.
- Supported parameters: `bcid` (barcode type), `text`, `gtin`, `serial`, `height`, `width`.
