import fs from 'fs'
import path from 'path'
import { TaxTypes } from '@medusajs/framework/types'
import { Logger } from '@medusajs/framework/types'
import { MedusaError } from '@medusajs/framework/utils'

export interface TaxLookupOptions {
	dataDirectory: string
}

export class TaxLookupProvider implements TaxTypes.ITaxProvider {
	static identifier = 'tax-lookup'
	protected logger_: Logger
	protected taxRates_: Record<string, number> = {}

	constructor({ logger }: { logger: Logger }, options: TaxLookupOptions) {
		this.logger_ = logger

		if (!options?.dataDirectory) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`[tax-lookup] dataDirectory is required`
			)
		}

		const dir = path.isAbsolute(options.dataDirectory)
			? options.dataDirectory
			: path.resolve(process.cwd(), options.dataDirectory)

		if (!fs.existsSync(dir)) {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`[tax-lookup] dataDirectory does not exist: ${dir}`
			)
		}

		const csvFiles = fs.readdirSync(dir).filter((f) => f.endsWith('.csv'))

		if (csvFiles.length === 0) {
			this.logger_.warn(`[tax-lookup] no CSV files found in ${dir}`)
		}

		for (const file of csvFiles) {
			const filePath = path.join(dir, file)
			const content = fs.readFileSync(filePath, 'utf-8')
			const lines = content.split('\n').filter((l) => l.trim())

			if (lines.length === 0) continue

			const headers = lines[0].split(',').map((h) => h.trim().toLowerCase())
			const zipIdx = headers.indexOf('zipcode')
			const rateIdx = headers.indexOf('estimatedcombinedrate')

			if (zipIdx === -1 || rateIdx === -1) {
				this.logger_.warn(`[tax-lookup] skipping ${file} — missing ZipCode or EstimatedCombinedRate column`)
				continue
			}

			let count = 0
			for (let i = 1; i < lines.length; i++) {
				const cols = lines[i].split(',')
				const zip = cols[zipIdx]?.trim()
				const rate = parseFloat(cols[rateIdx]?.trim())

				if (!zip || isNaN(rate)) continue

				// Store rate as percentage (e.g. 0.0975 -> 9.75)
				this.taxRates_[zip] = rate < 1 ? rate * 100 : rate
				count++
			}

			this.logger_.info(`[tax-lookup] loaded ${count} rates from ${file}`)
		}
	}

	getIdentifier(): string {
		return TaxLookupProvider.identifier
	}

	async getTaxLines(
		itemLines: TaxTypes.ItemTaxCalculationLine[],
		shippingLines: TaxTypes.ShippingTaxCalculationLine[],
		context: TaxTypes.TaxCalculationContext
	): Promise<(TaxTypes.ItemTaxLineDTO | TaxTypes.ShippingTaxLineDTO)[]> {
		const { address } = context

		const zip = address?.postal_code?.trim().slice(0, 5)
		if (!zip) {
			return []
		}

		const rate = this.taxRates_[zip] ?? 0

		const result: (TaxTypes.ItemTaxLineDTO | TaxTypes.ShippingTaxLineDTO)[] = []

		for (const { line_item } of itemLines) {
			result.push({
				line_item_id: line_item.id,
				rate,
				name: 'Sales Tax',
				code: `TAX-${zip}`,
				provider_id: this.getIdentifier()
			})
		}

		for (const { shipping_line } of shippingLines) {
			result.push({
				shipping_line_id: shipping_line.id,
				rate,
				name: 'Sales Tax',
				code: `TAX-${zip}`,
				provider_id: this.getIdentifier()
			})
		}

		return result
	}
}
