/// <reference types="jest" />
import { DeleteObjectCommand, DeleteObjectsCommand, GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MedusaError } from '@medusajs/framework/utils'
import { R2FileProvider, R2FileProviderConfig, sanitizeFilePath, encodeKeyForUrl } from '../r2/provider'

jest.mock('@aws-sdk/client-s3')
jest.mock('@aws-sdk/lib-storage')
jest.mock('@aws-sdk/s3-request-presigner')
jest.mock('ulid', () => ({ ulid: () => 'TESTULID0000000000000000' }))

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SIGNED_URL = 'https://signed.r2.example.com/file?X-Amz-Signature=abc'

const baseOptions = {
	region: 'auto',
	bucket: 'public-bucket',
	accessKeyId: 'pub-key-id',
	secretAccessKey: 'pub-secret',
	fileUrl: 'https://cdn.example.com',
	endpoint: 'https://account.r2.cloudflarestorage.com',
	privateRegion: 'auto',
	privateBucket: 'private-bucket',
	privateAccessKeyId: 'priv-key-id',
	privateSecretAccessKey: 'priv-secret',
	privateEndpoint: 'https://account-private.r2.cloudflarestorage.com'
}

const mockLogger = {
	error: jest.fn(),
	info: jest.fn(),
	warn: jest.fn(),
	debug: jest.fn()
}

function makeService(overrides: Partial<R2FileProviderConfig> = {}) {
	return new R2FileProvider({ logger: mockLogger as any }, { ...baseOptions, ...overrides })
}

// ─── Mock state ───────────────────────────────────────────────────────────────

let mockSend: jest.Mock
let mockUploadDone: jest.Mock

beforeEach(() => {
	jest.clearAllMocks()

	mockSend = jest.fn().mockResolvedValue({
		Body: {
			transformToByteArray: jest.fn().mockResolvedValue(new Uint8Array([72, 101, 108, 108, 111]))
		}
	})
	;(S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(() => ({ send: mockSend, destroy: jest.fn() }) as any)

	mockUploadDone = jest.fn().mockResolvedValue({})
	;(Upload as jest.MockedClass<typeof Upload>).mockImplementation(() => ({ done: mockUploadDone }) as any)
	;(getSignedUrl as jest.MockedFunction<typeof getSignedUrl>).mockResolvedValue(SIGNED_URL)
})

// ─── Constructor ──────────────────────────────────────────────────────────────

describe('R2FileService — constructor', () => {
	it('throws when accessKeyId is missing', () => {
		expect(() => makeService({ accessKeyId: undefined })).toThrow(MedusaError)
	})

	it('throws when secretAccessKey is missing', () => {
		expect(() => makeService({ secretAccessKey: undefined })).toThrow(MedusaError)
	})

	it('throws when private bucket config is incomplete', () => {
		expect(() => makeService({ privateBucket: undefined })).toThrow(MedusaError)
	})

	it('throws when privateAccessKeyId is missing', () => {
		expect(() => makeService({ privateAccessKeyId: undefined })).toThrow(MedusaError)
	})

	it('constructs successfully with full config', () => {
		expect(() => makeService()).not.toThrow()
	})

	it('creates two S3Client instances (public + private)', () => {
		makeService()
		expect(S3Client).toHaveBeenCalledTimes(2)
	})

	it('applies globalPrefix default to empty string', () => {
		const svc = makeService({ globalPrefix: undefined })
		expect((svc as any).config_.globalPrefix).toBe('')
	})

	it('applies custom globalPrefix', () => {
		const svc = makeService({ globalPrefix: 'media/' })
		expect((svc as any).config_.globalPrefix).toBe('media/')
	})

	it('uses default cacheControl when not specified', () => {
		const svc = makeService({ cacheControl: undefined })
		expect((svc as any).config_.cacheControl).toBe('public, max-age=31536000')
	})

	it('uses default downloadFileDuration of 3600', () => {
		const svc = makeService({ downloadFileDuration: undefined })
		expect((svc as any).config_.downloadFileDuration).toBe(3600)
	})
})

// ─── Constructor — endpoint-includes-bucket auto-strip (2.0.0) ────────────────

describe('R2FileService — endpoint includes bucket (auto-strip)', () => {
	it('strips the bucket name from the public endpoint', () => {
		const svc = makeService({
			endpoint: 'https://account.r2.cloudflarestorage.com/public-bucket'
		})
		expect((svc as any).config_.endpoint).toBe('https://account.r2.cloudflarestorage.com')
	})

	it('strips the bucket name from the private endpoint', () => {
		const svc = makeService({
			privateEndpoint: 'https://account.r2.cloudflarestorage.com/private-bucket'
		})
		expect((svc as any).config_.privateEndpoint).toBe('https://account.r2.cloudflarestorage.com')
	})

	it('warns when it strips the bucket from an endpoint', () => {
		makeService({
			endpoint: 'https://account.r2.cloudflarestorage.com/public-bucket'
		})
		expect(mockLogger.warn).toHaveBeenCalledWith(expect.stringContaining('Stripped the bucket name'))
	})

	it('passes the stripped endpoint to the S3 client', () => {
		makeService({
			endpoint: 'https://account.r2.cloudflarestorage.com/public-bucket'
		})
		const clientConfig = (S3Client as jest.MockedClass<typeof S3Client>).mock.calls[0][0] as any
		expect(clientConfig.endpoint).toBe('https://account.r2.cloudflarestorage.com')
	})

	it('leaves the endpoint untouched when it is the account host only', () => {
		const svc = makeService()
		expect((svc as any).config_.endpoint).toBe(baseOptions.endpoint)
		expect(mockLogger.warn).not.toHaveBeenCalled()
	})

	it('does not strip when a trailing path segment merely contains the bucket name', () => {
		// "public-bucket-archive" !== "public-bucket": only an exact final segment is stripped
		const endpoint = 'https://account.r2.cloudflarestorage.com/public-bucket-archive'
		const svc = makeService({ endpoint })
		expect((svc as any).config_.endpoint).toBe(endpoint)
		expect(mockLogger.warn).not.toHaveBeenCalled()
	})

	it('preserves a non-bucket path prefix while stripping only the bucket segment', () => {
		const svc = makeService({
			endpoint: 'https://account.r2.cloudflarestorage.com/base/public-bucket'
		})
		expect((svc as any).config_.endpoint).toBe('https://account.r2.cloudflarestorage.com/base')
	})
})

// ─── path helpers ─────────────────────────────────────────────────────────────

describe('sanitizeFilePath', () => {
	it('passes a clean nested path through unchanged', () => {
		expect(sanitizeFilePath('vendor_123/logo.png')).toBe('vendor_123/logo.png')
	})

	it('strips leading slashes', () => {
		expect(sanitizeFilePath('/leading/slash.png')).toBe('leading/slash.png')
	})

	it('converts backslashes to forward slashes', () => {
		expect(sanitizeFilePath('a\\b\\c.png')).toBe('a/b/c.png')
	})

	it('removes .. traversal segments', () => {
		expect(sanitizeFilePath('../../etc/passwd')).toBe('etc/passwd')
	})

	it('resolves . current-dir segments', () => {
		expect(sanitizeFilePath('./vendor/./logo.png')).toBe('vendor/logo.png')
	})

	it('collapses interior traversal', () => {
		expect(sanitizeFilePath('a/../b/c.png')).toBe('b/c.png')
	})

	it('reduces a pure-traversal path to empty string', () => {
		expect(sanitizeFilePath('../..')).toBe('')
	})

	it('does NOT decode percent-encoded separators (matches upstream)', () => {
		expect(sanitizeFilePath('..%2f..%2ffoo.png')).toBe('..%2f..%2ffoo.png')
	})
})

describe('encodeKeyForUrl', () => {
	it('preserves slash separators', () => {
		expect(encodeKeyForUrl('a/b/c.png')).toBe('a/b/c.png')
	})

	it('encodes in-segment special characters without touching slashes', () => {
		expect(encodeKeyForUrl('media/my file.png')).toBe('media/my%20file.png')
	})
})

// ─── upload() — public ACL ────────────────────────────────────────────────────

describe('R2FileService — upload() — public', () => {
	it('sends PutObjectCommand to the public bucket', async () => {
		const svc = makeService()
		await svc.upload({
			filename: 'photo.jpg',
			mimeType: 'image/jpeg',
			content: 'aGVsbG8=', // base64 "hello"
			access: 'public'
		})
		expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'public-bucket' }))
		expect(mockSend).toHaveBeenCalledTimes(1)
	})

	it('returns a public CDN url with encoded key', async () => {
		const svc = makeService()
		const result = await svc.upload({
			filename: 'photo.jpg',
			mimeType: 'image/jpeg',
			content: 'aGVsbG8=',
			access: 'public'
		})
		expect(result.url).toMatch(/^https:\/\/cdn\.example\.com\//)
		expect(result.key).toMatch(/^photo-TESTULID0000000000000000\.jpg$/)
	})

	it('includes globalPrefix in the file key', async () => {
		const svc = makeService({ globalPrefix: 'uploads/' })
		const result = await svc.upload({
			filename: 'banner.png',
			mimeType: 'image/png',
			content: 'aGVsbG8=',
			access: 'public'
		})
		expect(result.key).toMatch(/^uploads\/banner-/)
	})

	it('includes the file prefix in the key when provided', async () => {
		const svc = makeService()
		const result = await svc.upload({
			filename: 'thumb.png',
			mimeType: 'image/png',
			content: 'aGVsbG8=',
			access: 'public',
			prefix: 'thumbnails/'
		} as any)
		expect(result.key).toMatch(/^thumbnails\/thumb-/)
	})

	it('stores original-filename in object metadata', async () => {
		const svc = makeService()
		await svc.upload({
			filename: 'my file.pdf',
			mimeType: 'application/pdf',
			content: 'aGVsbG8=',
			access: 'public'
		})
		expect(PutObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				Metadata: expect.objectContaining({
					'original-filename': encodeURIComponent('my file.pdf')
				})
			})
		)
	})

	it('sets ContentType on the command', async () => {
		const svc = makeService()
		await svc.upload({
			filename: 'doc.pdf',
			mimeType: 'application/pdf',
			content: 'aGVsbG8=',
			access: 'public'
		})
		expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ ContentType: 'application/pdf' }))
	})

	it('decodes valid base64 content', async () => {
		const svc = makeService()
		const b64 = Buffer.from('Hello World').toString('base64') // 'SGVsbG8gV29ybGQ='
		await svc.upload({
			filename: 'hello.txt',
			mimeType: 'text/plain',
			content: b64,
			access: 'public'
		})
		const [call] = (PutObjectCommand as jest.MockedClass<typeof PutObjectCommand>).mock.calls
		const body = (call[0] as any).Body as Buffer
		expect(body.toString('utf8')).toBe('Hello World')
	})

	it('treats non-base64 content as utf8', async () => {
		const svc = makeService()
		await svc.upload({
			filename: 'data.json',
			mimeType: 'application/json',
			content: '{"key":"value"}',
			access: 'public'
		})
		const [call] = (PutObjectCommand as jest.MockedClass<typeof PutObjectCommand>).mock.calls
		const body = (call[0] as any).Body as Buffer
		expect(body.toString('utf8')).toBe('{"key":"value"}')
	})

	it('handles PNG image upload', async () => {
		const svc = makeService()
		const fakePng = Buffer.from([0x89, 0x50, 0x4e, 0x47]).toString('base64')
		const result = await svc.upload({
			filename: 'image.png',
			mimeType: 'image/png',
			content: fakePng,
			access: 'public'
		})
		expect(result.url).toContain('cdn.example.com')
		expect(result.key).toContain('.png')
	})

	it('handles SVG upload', async () => {
		const svc = makeService()
		const result = await svc.upload({
			filename: 'icon.svg',
			mimeType: 'image/svg+xml',
			content: '<svg xmlns="http://www.w3.org/2000/svg"/>',
			access: 'public'
		})
		expect(result.key).toContain('.svg')
	})

	it('preserves file extension including double extensions', async () => {
		const svc = makeService()
		const result = await svc.upload({
			filename: 'archive.tar.gz',
			mimeType: 'application/gzip',
			content: 'aGVsbG8=',
			access: 'public'
		})
		// path.parse('archive.tar.gz').ext === '.gz'
		expect(result.key).toMatch(/\.gz$/)
	})

	it('preserves a sanitized subdirectory carried in the filename', async () => {
		const svc = makeService({ globalPrefix: 'media/' })
		const result = await svc.upload({
			filename: 'vendor_123/logo.png',
			mimeType: 'image/png',
			content: 'aGVsbG8=',
			access: 'public'
		})
		expect(result.key).toBe('media/vendor_123/logo-TESTULID0000000000000000.png')
	})

	it('treats filename-path and prefix as equivalent ways to nest', async () => {
		const svc = makeService()
		const viaFilename = await svc.upload({
			filename: 'mypath/myfile.txt',
			mimeType: 'text/plain',
			content: 'aGVsbG8=',
			access: 'public'
		})
		const viaPrefix = await svc.upload({
			filename: 'myfile.txt',
			mimeType: 'text/plain',
			content: 'aGVsbG8=',
			access: 'public',
			prefix: 'mypath/'
		} as any)
		expect(viaFilename.key).toBe('mypath/myfile-TESTULID0000000000000000.txt')
		expect(viaPrefix.key).toBe(viaFilename.key)
	})

	it('strips path traversal from the filename, confining the key under globalPrefix', async () => {
		const svc = makeService({ globalPrefix: 'media/' })
		const result = await svc.upload({
			filename: '../../etc/passwd.png',
			mimeType: 'image/png',
			content: 'aGVsbG8=',
			access: 'public'
		})
		expect(result.key).toBe('media/etc/passwd-TESTULID0000000000000000.png')
		expect(result.key.startsWith('media/')).toBe(true)
	})

	it('does not let a malicious per-file prefix escape globalPrefix', async () => {
		const svc = makeService({ globalPrefix: 'media/' })
		const result = await svc.upload({
			filename: 'logo.png',
			mimeType: 'image/png',
			content: 'aGVsbG8=',
			access: 'public',
			prefix: '../../'
		} as any)
		expect(result.key).toBe('media/logo-TESTULID0000000000000000.png')
		expect(result.key.startsWith('media/')).toBe(true)
	})

	it('per-segment-encodes the url so subdirectory slashes survive', async () => {
		const svc = makeService({ globalPrefix: 'media/' })
		const result = await svc.upload({
			filename: 'vendor 1/logo.png',
			mimeType: 'image/png',
			content: 'aGVsbG8=',
			access: 'public'
		})
		expect(result.url).toBe('https://cdn.example.com/media/vendor%201/logo-TESTULID0000000000000000.png')
	})
})

// ─── upload() — content decoding (#14120 regression) ──────────────────────────

describe('R2FileService — upload() — content decoding (#14120)', () => {
	const uploadedBody = async (file: any): Promise<Buffer> => {
		const svc = makeService()
		await svc.upload(file)
		const [call] = (PutObjectCommand as jest.MockedClass<typeof PutObjectCommand>).mock.calls
		return (call[0] as any).Body as Buffer
	}

	it("preserves binary image bytes passed via buffer.toString('binary') (no UTF-8 corruption)", async () => {
		const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0xff, 0x80])
		const body = await uploadedBody({
			filename: 'image.png',
			mimeType: 'image/png',
			content: png.toString('binary'),
			access: 'public'
		})
		// Before the fix the leading 0x89 was re-encoded to the UTF-8 sequence
		// 0xC2 0x89, corrupting the file.
		expect(Buffer.compare(body, png)).toBe(0)
		expect([body[0], body[1], body[2], body[3]]).toEqual([0x89, 0x50, 0x4e, 0x47])
	})

	it('decodes base64-encoded content back to the original bytes', async () => {
		const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x00, 0xfe])
		const body = await uploadedBody({
			filename: 'image.png',
			mimeType: 'image/png',
			content: png.toString('base64'),
			access: 'public'
		})
		expect(Buffer.compare(body, png)).toBe(0)
	})

	it('preserves UTF-8 special characters in text/CSV content (guards #13649)', async () => {
		const csv = 'name,city\nJoão,São Paulo\n'
		const body = await uploadedBody({
			filename: 'data.csv',
			mimeType: 'text/csv',
			content: csv,
			access: 'public'
		})
		expect(Buffer.compare(body, Buffer.from(csv, 'utf8'))).toBe(0)
	})
})

// ─── upload() — private ACL ───────────────────────────────────────────────────

describe('R2FileService — upload() — private', () => {
	it('sends PutObjectCommand to the private bucket', async () => {
		const svc = makeService()
		await svc.upload({
			filename: 'report.pdf',
			mimeType: 'application/pdf',
			content: 'aGVsbG8=',
			access: 'private'
		})
		expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'private-bucket' }))
	})

	it('returns an empty url for private files', async () => {
		const svc = makeService()
		const result = await svc.upload({
			filename: 'secret.pdf',
			mimeType: 'application/pdf',
			content: 'aGVsbG8=',
			access: 'private'
		})
		expect(result.url).toBe('')
		expect(result.key).toBeTruthy()
	})

	it('handles CSV upload to private bucket', async () => {
		const svc = makeService()
		const result = await svc.upload({
			filename: 'export.csv',
			mimeType: 'text/csv',
			content: 'id,name\n1,Alice',
			access: 'private'
		})
		expect(result.key).toContain('.csv')
		expect(result.url).toBe('')
	})
})

// ─── upload() — validation ────────────────────────────────────────────────────

describe('R2FileService — upload() — validation', () => {
	it('throws when filename is missing', async () => {
		const svc = makeService()
		await expect(svc.upload({ mimeType: 'image/jpeg', content: 'aGVsbG8=', access: 'public' } as any)).rejects.toThrow(MedusaError)
	})

	it('throws when the filename resolves to an empty path after sanitization', async () => {
		const svc = makeService({ globalPrefix: 'media/' })
		await expect(
			svc.upload({
				filename: '../..',
				mimeType: 'image/png',
				content: 'aGVsbG8=',
				access: 'public'
			})
		).rejects.toThrow(MedusaError)
	})

	it('propagates S3 send errors', async () => {
		mockSend.mockRejectedValue(new Error('S3 network error'))
		const svc = makeService()
		await expect(
			svc.upload({
				filename: 'photo.jpg',
				mimeType: 'image/jpeg',
				content: 'aGVsbG8=',
				access: 'public'
			})
		).rejects.toThrow('S3 network error')
		expect(mockLogger.error).toHaveBeenCalled()
	})
})

// ─── delete() ────────────────────────────────────────────────────────────────

describe('R2FileService — delete()', () => {
	it('sends DeleteObjectCommand for a single public file', async () => {
		const svc = makeService()
		await svc.delete({ fileKey: 'photo-TESTULID.jpg', access: 'public' })
		expect(DeleteObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'public-bucket', Key: 'photo-TESTULID.jpg' }))
	})

	it('sends DeleteObjectCommand for a single private file', async () => {
		const svc = makeService()
		await svc.delete({ fileKey: 'secret-TESTULID.pdf', access: 'private' })
		expect(DeleteObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'private-bucket', Key: 'secret-TESTULID.pdf' }))
	})

	it('sends DeleteObjectsCommand for an array of files', async () => {
		const svc = makeService()
		await svc.delete([
			{ fileKey: 'file-1.jpg', access: 'public' },
			{ fileKey: 'file-2.jpg', access: 'public' }
		])
		expect(DeleteObjectsCommand).toHaveBeenCalledWith(
			expect.objectContaining({
				Bucket: 'public-bucket',
				Delete: {
					Objects: [{ Key: 'file-1.jpg' }, { Key: 'file-2.jpg' }],
					Quiet: true
				}
			})
		)
	})

	it('logs errors instead of throwing on S3 failure', async () => {
		mockSend.mockRejectedValue(new Error('Delete failed'))
		const svc = makeService()
		await expect(svc.delete({ fileKey: 'gone.jpg', access: 'public' })).resolves.toBeUndefined()
		expect(mockLogger.error).toHaveBeenCalled()
	})
})

// ─── getPresignedDownloadUrl() ────────────────────────────────────────────────

describe('R2FileService — getPresignedDownloadUrl()', () => {
	it('returns a signed URL for private files', async () => {
		const svc = makeService()
		const url = await svc.getPresignedDownloadUrl({
			fileKey: 'secret-TESTULID.pdf',
			access: 'private'
		})
		expect(url).toBe(SIGNED_URL)
		expect(getSignedUrl).toHaveBeenCalledTimes(1)
	})

	it('creates GetObjectCommand with private bucket and key', async () => {
		const svc = makeService()
		await svc.getPresignedDownloadUrl({
			fileKey: 'report.pdf',
			access: 'private'
		})
		expect(GetObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'private-bucket', Key: 'report.pdf' }))
	})

	it('uses the configured downloadFileDuration for expiry', async () => {
		const svc = makeService({ downloadFileDuration: 1800 })
		await svc.getPresignedDownloadUrl({ fileKey: 'file.pdf', access: 'private' })
		expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ expiresIn: 1800 }))
	})

	it('throws MedusaError for public files', async () => {
		const svc = makeService()
		await expect(svc.getPresignedDownloadUrl({ fileKey: 'photo.jpg', access: 'public' })).rejects.toThrow(MedusaError)
	})

	it('throws with INVALID_DATA type for public files', async () => {
		const svc = makeService()
		await expect(svc.getPresignedDownloadUrl({ fileKey: 'photo.jpg', access: 'public' })).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
	})
})

// ─── getPresignedUploadUrl() ──────────────────────────────────────────────────

describe('R2FileService — getPresignedUploadUrl()', () => {
	it('returns a signed URL and key for private files', async () => {
		const svc = makeService()
		const result = await svc.getPresignedUploadUrl({
			filename: 'upload.pdf',
			mimeType: 'application/pdf',
			access: 'private'
		})
		expect(result.url).toBe(SIGNED_URL)
		expect(result.key).toBe('upload.pdf') // globalPrefix is '' by default
	})

	it('includes globalPrefix in the key', async () => {
		const svc = makeService({ globalPrefix: 'docs/' })
		const result = await svc.getPresignedUploadUrl({
			filename: 'contract.pdf',
			mimeType: 'application/pdf',
			access: 'private'
		})
		expect(result.key).toBe('docs/contract.pdf')
	})

	it('creates PutObjectCommand with private bucket', async () => {
		const svc = makeService()
		await svc.getPresignedUploadUrl({
			filename: 'upload.pdf',
			mimeType: 'application/pdf',
			access: 'private'
		})
		expect(PutObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'private-bucket' }))
	})

	it('uses the provided expiresIn duration', async () => {
		const svc = makeService()
		await svc.getPresignedUploadUrl({
			filename: 'upload.pdf',
			mimeType: 'application/pdf',
			access: 'private',
			expiresIn: 300
		})
		expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ expiresIn: 300 }))
	})

	it('falls back to 3600s when expiresIn is not provided', async () => {
		const svc = makeService()
		await svc.getPresignedUploadUrl({
			filename: 'upload.pdf',
			mimeType: 'application/pdf',
			access: 'private'
		})
		expect(getSignedUrl).toHaveBeenCalledWith(expect.anything(), expect.anything(), expect.objectContaining({ expiresIn: 3600 }))
	})

	it('throws MedusaError for public files', async () => {
		const svc = makeService()
		await expect(
			svc.getPresignedUploadUrl({
				filename: 'photo.jpg',
				mimeType: 'image/jpeg',
				access: 'public'
			})
		).rejects.toThrow(MedusaError)
	})

	it('throws MedusaError when filename is missing', async () => {
		const svc = makeService()
		await expect(
			svc.getPresignedUploadUrl({
				mimeType: 'application/pdf',
				access: 'private'
			} as any)
		).rejects.toThrow(MedusaError)
	})

	it('throws when the filename resolves to an empty path after sanitization', async () => {
		const svc = makeService({ globalPrefix: 'docs/' })
		await expect(
			svc.getPresignedUploadUrl({
				filename: '../..',
				mimeType: 'application/pdf',
				access: 'private'
			})
		).rejects.toThrow(MedusaError)
	})

	it('strips path traversal from the filename, keeping the key under globalPrefix', async () => {
		const svc = makeService({ globalPrefix: 'docs/' })
		const result = await svc.getPresignedUploadUrl({
			filename: '../../secret/contract.pdf',
			mimeType: 'application/pdf',
			access: 'private'
		})
		expect(result.key).toBe('docs/secret/contract.pdf')
		expect(result.key.startsWith('docs/')).toBe(true)
	})

	it('honors a per-file prefix without ulid or dir splitting', async () => {
		const svc = makeService({ globalPrefix: 'docs/' })
		const result = await svc.getPresignedUploadUrl({
			filename: 'contract.pdf',
			mimeType: 'application/pdf',
			access: 'private',
			prefix: 'vendor_9/'
		} as any)
		expect(result.key).toBe('docs/vendor_9/contract.pdf')
	})

	it('does not let a malicious prefix escape globalPrefix', async () => {
		const svc = makeService({ globalPrefix: 'docs/' })
		const result = await svc.getPresignedUploadUrl({
			filename: 'contract.pdf',
			mimeType: 'application/pdf',
			access: 'private',
			prefix: '../../'
		} as any)
		expect(result.key).toBe('docs/contract.pdf')
		expect(result.key.startsWith('docs/')).toBe(true)
	})
})

// ─── getDownloadStream() ──────────────────────────────────────────────────────

describe('R2FileService — getDownloadStream()', () => {
	it('throws when fileKey is missing', async () => {
		const svc = makeService()
		await expect(svc.getDownloadStream({ access: 'public' } as any)).rejects.toThrow(MedusaError)
	})

	it('sends GetObjectCommand to public bucket for public files', async () => {
		const svc = makeService()
		await svc.getDownloadStream({ fileKey: 'photo.jpg', access: 'public' })
		expect(GetObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'public-bucket', Key: 'photo.jpg' }))
	})

	it('sends GetObjectCommand to private bucket for private files', async () => {
		const svc = makeService()
		await svc.getDownloadStream({ fileKey: 'report.pdf', access: 'private' })
		expect(GetObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'private-bucket', Key: 'report.pdf' }))
	})

	it('returns the response Body stream', async () => {
		const fakeStream = { pipe: jest.fn() }
		mockSend.mockResolvedValue({ Body: fakeStream })
		const svc = makeService()
		const result = await svc.getDownloadStream({ fileKey: 'photo.jpg', access: 'public' })
		expect(result).toBe(fakeStream)
	})
})

// ─── getAsBuffer() ────────────────────────────────────────────────────────────

describe('R2FileService — getAsBuffer()', () => {
	it('throws when fileKey is missing', async () => {
		const svc = makeService()
		await expect(svc.getAsBuffer({ access: 'public' } as any)).rejects.toThrow(MedusaError)
	})

	it('sends GetObjectCommand to public bucket for public files', async () => {
		const svc = makeService()
		await svc.getAsBuffer({ fileKey: 'photo.jpg', access: 'public' })
		expect(GetObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'public-bucket', Key: 'photo.jpg' }))
	})

	it('sends GetObjectCommand to private bucket for private files', async () => {
		const svc = makeService()
		await svc.getAsBuffer({ fileKey: 'report.pdf', access: 'private' })
		expect(GetObjectCommand).toHaveBeenCalledWith(expect.objectContaining({ Bucket: 'private-bucket', Key: 'report.pdf' }))
	})

	it('returns file contents as a Buffer', async () => {
		const content = new Uint8Array([1, 2, 3, 4, 5])
		mockSend.mockResolvedValue({
			Body: { transformToByteArray: jest.fn().mockResolvedValue(content) }
		})
		const svc = makeService()
		const result = await svc.getAsBuffer({ fileKey: 'data.bin', access: 'public' })
		expect(Buffer.isBuffer(result)).toBe(true)
		expect(result).toEqual(Buffer.from(content))
	})
})

// ─── getUploadStream() ────────────────────────────────────────────────────────

describe('R2FileService — getUploadStream()', () => {
	it('throws when filename is missing', async () => {
		const svc = makeService()
		await expect(svc.getUploadStream({ mimeType: 'image/jpeg', access: 'public' } as any)).rejects.toThrow(MedusaError)
	})

	it('throws when the filename resolves to an empty path after sanitization', async () => {
		const svc = makeService({ globalPrefix: 'media/' })
		await expect(
			svc.getUploadStream({
				filename: '../..',
				mimeType: 'image/png',
				access: 'public'
			} as any)
		).rejects.toThrow(MedusaError)
	})

	it('returns writeStream, promise, url, and fileKey', async () => {
		const svc = makeService()
		const result = await svc.getUploadStream({
			filename: 'video.mp4',
			mimeType: 'video/mp4',
			access: 'public'
		})
		expect(result.writeStream).toBeDefined()
		expect(result.promise).toBeInstanceOf(Promise)
		expect(result.url).toContain('cdn.example.com')
		expect(result.fileKey).toMatch(/^video-TESTULID/)
	})

	it('passes public bucket to Upload for public access', async () => {
		const svc = makeService()
		await svc.getUploadStream({
			filename: 'video.mp4',
			mimeType: 'video/mp4',
			access: 'public'
		})
		const uploadCall = (Upload as jest.MockedClass<typeof Upload>).mock.calls[0][0]
		expect((uploadCall.params as any).Bucket).toBe('public-bucket')
	})

	it('passes private bucket to Upload for private access', async () => {
		const svc = makeService()
		await svc.getUploadStream({
			filename: 'backup.zip',
			mimeType: 'application/zip',
			access: 'private'
		})
		const uploadCall = (Upload as jest.MockedClass<typeof Upload>).mock.calls[0][0]
		expect((uploadCall.params as any).Bucket).toBe('private-bucket')
	})

	it('promise resolves to url + key for public upload', async () => {
		mockUploadDone.mockResolvedValue({})
		const svc = makeService()
		const { promise } = await svc.getUploadStream({
			filename: 'photo.jpg',
			mimeType: 'image/jpeg',
			access: 'public'
		})
		const result = await promise
		expect(result.url).toMatch(/^https:\/\/cdn\.example\.com\//)
		expect(result.key).toMatch(/^photo-TESTULID/)
	})

	it('returns an empty top-level url for private upload (private bucket is not behind the CDN)', async () => {
		const svc = makeService()
		const result = await svc.getUploadStream({
			filename: 'secret.zip',
			mimeType: 'application/zip',
			access: 'private'
		})
		expect(result.url).toBe('')
		expect(result.fileKey).toMatch(/^secret-TESTULID/)
	})

	it('promise resolves to empty url for private upload', async () => {
		mockUploadDone.mockResolvedValue({})
		const svc = makeService()
		const { promise } = await svc.getUploadStream({
			filename: 'secret.zip',
			mimeType: 'application/zip',
			access: 'private'
		})
		const result = await promise
		expect(result.url).toBe('')
		expect(result.key).toMatch(/^secret-TESTULID/)
	})

	it('preserves subdirectories and per-segment-encodes the returned url', async () => {
		const svc = makeService({ globalPrefix: 'media/' })
		const result = await svc.getUploadStream({
			filename: 'vendor 1/clip.mp4',
			mimeType: 'video/mp4',
			access: 'public'
		} as any)
		expect(result.fileKey).toBe('media/vendor 1/clip-TESTULID0000000000000000.mp4')
		expect(result.url).toBe('https://cdn.example.com/media/vendor%201/clip-TESTULID0000000000000000.mp4')
	})
})
