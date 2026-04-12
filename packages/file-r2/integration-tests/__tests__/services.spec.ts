import fs from "fs/promises"
import axios from "axios"
import { R2FileProvider } from "../../src/providers/r2/provider"
jest.setTimeout(100000)

// Note: This test hits the R2 service, and it is mainly meant to be run manually after setting all the envvars below.
describe("R2 File Plugin", () => {
	let r2Service: R2FileProvider
	let fixtureImagePath: string

	beforeAll(() => {
		fixtureImagePath =
			process.cwd() + "/integration-tests/__fixtures__/catphoto.jpg"

		r2Service = new R2FileProvider(
			{
				logger: console as any,
			},
			{
				endpoint: process.env.R2_ENDPOINT ?? "",
				fileUrl: process.env.R2_FILE_URL ?? "",
				accessKeyId: process.env.R2_ACCESS_KEY_ID ?? "",
				secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? "",
				region: process.env.R2_REGION ?? "auto",
				bucket: process.env.R2_BUCKET ?? "",
				globalPrefix: "tests/",
				// Private bucket config
				privateEndpoint: process.env.R2_PRIVATE_ENDPOINT ?? "",
				privateAccessKeyId: process.env.R2_PRIVATE_ACCESS_KEY_ID ?? "",
				privateSecretAccessKey: process.env.R2_PRIVATE_SECRET_ACCESS_KEY ?? "",
				privateRegion: process.env.R2_PRIVATE_REGION ?? "auto",
				privateBucket: process.env.R2_PRIVATE_BUCKET ?? "",
			}
		)
	})

	it("uploads, reads via signed URL, and then deletes a private file successfully", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBinary = fileContent.toString("binary")
		const fixtureAsBase64 = fileContent.toString("base64")

		const resp = await r2Service.upload({
			filename: "catphoto.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "private",
		})

		expect(resp).toEqual({
			key: expect.stringMatching(/tests\/catphoto.*\.jpg/),
			url: "",
		})

		const signedUrl = await r2Service.getPresignedDownloadUrl({
			fileKey: resp.key,
			access: "private",
		})

		const signedUrlFile = Buffer.from(
			await axios
				.get(signedUrl, { responseType: "arraybuffer" })
				.then((r) => r.data)
		)

		expect(signedUrlFile.toString("binary")).toEqual(fixtureAsBinary)

		await r2Service.delete({ fileKey: resp.key })

		// After deletion, the signed URL should return a 404
		const deletedSignedUrl = await r2Service.getPresignedDownloadUrl({
			fileKey: resp.key,
			access: "private",
		})

		const { response } = await axios
			.get(deletedSignedUrl, { responseType: "arraybuffer" })
			.catch((e) => e)

		expect(response.status).toEqual(404)
	})

	it("uploads and then deletes a public file successfully", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBase64 = fileContent.toString("base64")

		const resp = await r2Service.upload({
			filename: "catphoto.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "public",
		})

		expect(resp).toEqual({
			key: expect.stringMatching(/tests\/catphoto.*\.jpg/),
			url: expect.stringMatching(/https:\/\/.*\.jpg/),
		})

		const urlResp = await axios.get(resp.url).catch((e) => e.response)
		expect(urlResp.status).toEqual(200)

		await r2Service.delete({ fileKey: resp.key })
	})

	it("gets a presigned upload URL and uploads a file successfully", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBase64 = fileContent.toString("base64")

		const resp = await r2Service.getPresignedUploadUrl({
			filename: "catphoto.jpg",
			mimeType: "image/jpeg",
			access: "private",
		})

		expect(resp).toEqual({
			key: expect.stringMatching(/tests\/catphoto\.jpg/),
			url: expect.stringMatching(/https:\/\/.*catphoto\.jpg/),
		})

		const uploadResp = await axios.put(resp.url, fileContent, {
			headers: {
				"Content-Type": "image/jpeg",
			},
		})

		expect(uploadResp.status).toEqual(200)

		const signedUrl = await r2Service.getPresignedDownloadUrl({
			fileKey: resp.key,
			access: "private",
		})

		const signedUrlFile = Buffer.from(
			await axios
				.get(signedUrl, { responseType: "arraybuffer" })
				.then((r) => r.data)
		)

		expect(signedUrlFile.toString("base64")).toEqual(fixtureAsBase64)

		await r2Service.delete({ fileKey: resp.key })
	})

	it("gets a presigned upload URL for a nested filename structure and uploads a file successfully", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBase64 = fileContent.toString("base64")

		const resp = await r2Service.getPresignedUploadUrl({
			filename: "testfolder/catphoto.jpg",
			mimeType: "image/jpeg",
			access: "private",
		})

		expect(resp).toEqual({
			key: expect.stringMatching(/tests\/testfolder\/catphoto\.jpg/),
			url: expect.stringMatching(/https:\/\/.*testfolder\/catphoto\.jpg/),
		})

		const uploadResp = await axios.put(resp.url, fileContent, {
			headers: {
				"Content-Type": "image/jpeg",
			},
		})

		expect(uploadResp.status).toEqual(200)

		const signedUrl = await r2Service.getPresignedDownloadUrl({
			fileKey: resp.key,
			access: "private",
		})

		const signedUrlFile = Buffer.from(
			await axios
				.get(signedUrl, { responseType: "arraybuffer" })
				.then((r) => r.data)
		)

		expect(signedUrlFile.toString("base64")).toEqual(fixtureAsBase64)

		await r2Service.delete({ fileKey: resp.key })
	})

	it("deletes multiple files in bulk", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBase64 = fileContent.toString("base64")

		const cat = await r2Service.upload({
			filename: "catphoto.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "public",
		})
		const cat1 = await r2Service.upload({
			filename: "catphoto-1.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "public",
		})
		const cat2 = await r2Service.upload({
			filename: "catphoto-2.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "public",
		})

		await r2Service.delete([
			{ fileKey: cat.key },
			{ fileKey: cat1.key },
			{ fileKey: cat2.key },
		])
	})

	it("deletes a file by URL", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBase64 = fileContent.toString("base64")

		const resp = await r2Service.upload({
			filename: "delete-by-url-test.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "public",
		})

		// Verify the file exists via the S3 API
		const buffer = await r2Service.getAsBuffer({
			fileKey: resp.key,
			access: "public",
		})
		expect(buffer.toString("base64")).toEqual(fixtureAsBase64)

		await r2Service.deleteByUrl(resp.url)

		// Verify the file no longer exists via the S3 API
		await expect(
			r2Service.getAsBuffer({ fileKey: resp.key, access: "public" })
		).rejects.toThrow()
	})

	it("retrieves a file as a readable stream", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBase64 = fileContent.toString("base64")

		const resp = await r2Service.upload({
			filename: "stream-test.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "private",
		})

		const stream = await r2Service.getDownloadStream({
			fileKey: resp.key,
			access: "private",
		})

		const chunks: Buffer[] = []
		for await (const chunk of stream) {
			chunks.push(Buffer.from(chunk))
		}
		const downloaded = Buffer.concat(chunks)

		expect(downloaded.toString("base64")).toEqual(fixtureAsBase64)

		await r2Service.delete({ fileKey: resp.key })
	})

	it("retrieves a file as a buffer", async () => {
		const fileContent = await fs.readFile(fixtureImagePath)
		const fixtureAsBase64 = fileContent.toString("base64")

		const resp = await r2Service.upload({
			filename: "buffer-test.jpg",
			mimeType: "image/jpeg",
			content: fixtureAsBase64,
			access: "private",
		})

		const buffer = await r2Service.getAsBuffer({
			fileKey: resp.key,
			access: "private",
		})

		expect(buffer.toString("base64")).toEqual(fixtureAsBase64)

		await r2Service.delete({ fileKey: resp.key })
	})
})
