# medusa-plugin-tax-lookup

Tax provider for Medusa that looks up tax rates by ZIP code from CSV files.

[Documentation](https://pevey.com/medusa-plugin-tax-lookup)

If you are not familiar with Medusa, you can learn more on [the project web site](https://www.medusajs.com/).

## Features

- Loads tax rates from CSV files at startup
- Looks up tax rates by 5-digit ZIP code
- Supports multiple CSV files in a single directory

## Installation

Inside your medusa backend root folder:

```bash
yarn add medusa-plugin-tax-lookup
```

Replace "yarn add" with the correct command for your package manager if you are using (for example) npm, pnpm, or bun.

## Configuration

Enable in your medusa-config.ts file. Example:

```ts
module.exports = defineConfig({
	//... other config
	modules: [
		{
			resolve: '@medusajs/medusa/tax',
			options: {
				providers: [
					{
						resolve: 'medusa-plugin-tax-lookup',
						id: 'tax-lookup',
						options: {
							dataDirectory: './tax-data'
						}
					}
				]
			}
		}
		// ... other modules
	]
})
```

### Options

| Option          | Type     | Required | Description                                                                                         |
| --------------- | -------- | -------- | --------------------------------------------------------------------------------------------------- |
| `dataDirectory` | `string` | Yes      | Path to the directory containing CSV files. Can be absolute or relative to the Medusa project root. |

## CSV Format

Place one or more CSV files in the configured `dataDirectory`. Each file must have `ZipCode` and `EstimatedCombinedRate` columns. All other columns are ignored.

```csv
ZipCode,EstimatedCombinedRate
90001,0.105
90002,0.1075
90003,0.0975
```

Rates can be provided as decimals (e.g. `0.0975`) or percentages (e.g. `9.75`). Decimal values less than 1 are automatically converted to percentages.

If multiple CSV files contain the same ZIP code, the last file loaded wins.

## Data Sources

The column names the tax provider is configured to use are based on the format of csv files downloaded from Avalara: https://www.avalara.com/taxrates/en/download-tax-tables.html.

However, you can use any spreadsheet you want. Just change the name of the rate column in your data source to `EstimatedCombinedRate` and the postal code column to `ZipCode`.

## Building for Production

Make sure you copy your configured tax data directory to your .medusa/server build output. You can automate this by updating your build script in your project's package.json.

Example:

```
"build": "medusa build && cp -R tax-data .medusa/server",
```
