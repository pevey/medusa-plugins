import path from 'path'
import { TaxLookupProvider, TaxLookupOptions } from '../../providers/tax-lookup/provider'

const fixturesDir = path.resolve(__dirname, '__fixtures__')

const mockLogger = {
	info: jest.fn(),
	warn: jest.fn(),
	error: jest.fn(),
	debug: jest.fn(),
	activity: jest.fn(),
	progress: jest.fn(),
	log: jest.fn(),
	panic: jest.fn(),
	shouldLog: jest.fn(),
	setLogLevel: jest.fn(),
	unsetLogLevel: jest.fn(),
} as any

function createProvider(options: TaxLookupOptions) {
	return new TaxLookupProvider({ logger: mockLogger }, options)
}

function makeContext(postalCode?: string) {
	return {
		address: {
			postal_code: postalCode,
		},
	} as any
}

function makeItemLines(ids: string[]) {
	return ids.map((id) => ({ line_item: { id } })) as any
}

function makeShippingLines(ids: string[]) {
	return ids.map((id) => ({ shipping_line: { id } })) as any
}

describe("TaxLookupProvider", () => {
	beforeEach(() => {
		jest.clearAllMocks()
	})

	describe("constructor", () => {
		it("throws when dataDirectory is not provided", () => {
			expect(() => createProvider({} as any)).toThrow("dataDirectory is required")
		})

		it("throws when dataDirectory does not exist", () => {
			expect(() => createProvider({ dataDirectory: "/nonexistent/path" })).toThrow(
				"dataDirectory does not exist"
			)
		})

		it("loads CSV files from the fixtures directory", () => {
			createProvider({ dataDirectory: fixturesDir })
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining("loaded")
			)
		})

		it("warns when a CSV is missing required columns", () => {
			createProvider({ dataDirectory: fixturesDir })
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining("bad-headers.csv")
			)
		})

		it("warns when directory has no CSV files", () => {
			const fs = require('fs')
			const os = require('os')
			const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'tax-test-'))
			createProvider({ dataDirectory: tmpDir })
			expect(mockLogger.warn).toHaveBeenCalledWith(
				expect.stringContaining("no CSV files found")
			)
			fs.rmSync(tmpDir, { recursive: true })
		})
	})

	describe("CSV parsing", () => {
		it("loads the CA tax rates CSV", () => {
			createProvider({ dataDirectory: fixturesDir })
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining("TAXRATES_ZIP5_CA202604.csv")
			)
		})

		it("loads the LA tax rates CSV", () => {
			createProvider({ dataDirectory: fixturesDir })
			expect(mockLogger.info).toHaveBeenCalledWith(
				expect.stringContaining("TAXRATES_ZIP5_LA202604.csv")
			)
		})

		it("converts decimal rates to percentages", async () => {
			const provider = createProvider({ dataDirectory: fixturesDir })
			// minimal.csv: 10001 -> 0.08875 -> 8.875%
			const result = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("10001")
			)
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({ rate: 8.875 })
		})

		it("ignores extra columns in CSV files", async () => {
			const provider = createProvider({ dataDirectory: fixturesDir })
			// CA CSV has State, ZipCode, TaxRegionName, EstimatedCombinedRate, etc.
			// 90001 -> 0.105 -> 10.5%
			const result = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("90001")
			)
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({ rate: 10.5 })
		})

		it("loads rates from multiple state CSVs", async () => {
			const provider = createProvider({ dataDirectory: fixturesDir })
			// CA zip
			const caResult = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("90001")
			)
			expect(caResult[0]).toMatchObject({ rate: 10.5 })
			// LA zip
			const laResult = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("70001")
			)
			expect(laResult[0]).toMatchObject({ rate: 9.75 })
		})
	})

	describe("getTaxLines", () => {
		let provider: TaxLookupProvider

		beforeEach(() => {
			provider = createProvider({ dataDirectory: fixturesDir })
		})

		it("returns empty array when no postal code", async () => {
			const result = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				makeShippingLines(["ship_1"]),
				makeContext(undefined)
			)
			expect(result).toEqual([])
		})

		it("returns rate 0 for unknown zip codes", async () => {
			const result = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("00000")
			)
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({ rate: 0 })
		})

		it("truncates postal code to 5 digits", async () => {
			// 90001-1234 should match 90001
			const result = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("90001-1234")
			)
			expect(result).toHaveLength(1)
			expect(result[0]).toMatchObject({ rate: 10.5 })
		})

		it("returns tax lines for items and shipping", async () => {
			const result = await provider.getTaxLines(
				makeItemLines(["item_1", "item_2"]),
				makeShippingLines(["ship_1"]),
				makeContext("90002")
			)
			expect(result).toHaveLength(3)
			expect(result[0]).toMatchObject({
				line_item_id: "item_1",
				rate: 10.75,
				name: "Sales Tax",
				code: "TAX-90002",
				provider_id: "tax-lookup",
			})
			expect(result[1]).toMatchObject({
				line_item_id: "item_2",
				rate: 10.75,
			})
			expect(result[2]).toMatchObject({
				shipping_line_id: "ship_1",
				rate: 10.75,
				name: "Sales Tax",
				code: "TAX-90002",
			})
		})

		it("looks up a known CA rate", async () => {
			// 90003 -> 0.0975 -> 9.75%
			const result = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("90003")
			)
			expect(result[0]).toMatchObject({ rate: 9.75, code: "TAX-90003" })
		})

		it("looks up a known LA rate", async () => {
			// 70002 -> 0.0975 -> 9.75%
			const result = await provider.getTaxLines(
				makeItemLines(["item_1"]),
				[],
				makeContext("70002")
			)
			expect(result[0]).toMatchObject({ rate: 9.75, code: "TAX-70002" })
		})
	})
})
