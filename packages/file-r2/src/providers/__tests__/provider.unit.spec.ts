/// <reference types="jest" />
import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	PutObjectCommand,
	S3Client
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { MedusaError } from '@medusajs/framework/utils'
import { R2FileProvider } from '../r2/provider'

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

function makeService(overrides: Partial<typeof baseOptions> = {}) {
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
	;(S3Client as jest.MockedClass<typeof S3Client>).mockImplementation(
		() => ({ send: mockSend, destroy: jest.fn() }) as any
	)

	mockUploadDone = jest.fn().mockResolvedValue({})
	;(Upload as jest.MockedClass<typeof Upload>).mockImplementation(
		() => ({ done: mockUploadDone }) as any
	)
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
		expect(PutObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'public-bucket' })
		)
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
		expect(PutObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ ContentType: 'application/pdf' })
		)
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
		expect(PutObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'private-bucket' })
		)
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
		await expect(
			svc.upload({ mimeType: 'image/jpeg', content: 'aGVsbG8=', access: 'public' } as any)
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
		expect(DeleteObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'public-bucket', Key: 'photo-TESTULID.jpg' })
		)
	})

	it('sends DeleteObjectCommand for a single private file', async () => {
		const svc = makeService()
		await svc.delete({ fileKey: 'secret-TESTULID.pdf', access: 'private' })
		expect(DeleteObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'private-bucket', Key: 'secret-TESTULID.pdf' })
		)
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
		expect(GetObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'private-bucket', Key: 'report.pdf' })
		)
	})

	it('uses the configured downloadFileDuration for expiry', async () => {
		const svc = makeService({ downloadFileDuration: 1800 })
		await svc.getPresignedDownloadUrl({ fileKey: 'file.pdf', access: 'private' })
		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ expiresIn: 1800 })
		)
	})

	it('throws MedusaError for public files', async () => {
		const svc = makeService()
		await expect(
			svc.getPresignedDownloadUrl({ fileKey: 'photo.jpg', access: 'public' })
		).rejects.toThrow(MedusaError)
	})

	it('throws with INVALID_DATA type for public files', async () => {
		const svc = makeService()
		await expect(
			svc.getPresignedDownloadUrl({ fileKey: 'photo.jpg', access: 'public' })
		).rejects.toMatchObject({ type: MedusaError.Types.INVALID_DATA })
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
		expect(PutObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'private-bucket' })
		)
	})

	it('uses the provided expiresIn duration', async () => {
		const svc = makeService()
		await svc.getPresignedUploadUrl({
			filename: 'upload.pdf',
			mimeType: 'application/pdf',
			access: 'private',
			expiresIn: 300
		})
		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ expiresIn: 300 })
		)
	})

	it('falls back to 3600s when expiresIn is not provided', async () => {
		const svc = makeService()
		await svc.getPresignedUploadUrl({
			filename: 'upload.pdf',
			mimeType: 'application/pdf',
			access: 'private'
		})
		expect(getSignedUrl).toHaveBeenCalledWith(
			expect.anything(),
			expect.anything(),
			expect.objectContaining({ expiresIn: 3600 })
		)
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
		expect(GetObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'public-bucket', Key: 'photo.jpg' })
		)
	})

	it('sends GetObjectCommand to private bucket for private files', async () => {
		const svc = makeService()
		await svc.getDownloadStream({ fileKey: 'report.pdf', access: 'private' })
		expect(GetObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'private-bucket', Key: 'report.pdf' })
		)
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
		expect(GetObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'public-bucket', Key: 'photo.jpg' })
		)
	})

	it('sends GetObjectCommand to private bucket for private files', async () => {
		const svc = makeService()
		await svc.getAsBuffer({ fileKey: 'report.pdf', access: 'private' })
		expect(GetObjectCommand).toHaveBeenCalledWith(
			expect.objectContaining({ Bucket: 'private-bucket', Key: 'report.pdf' })
		)
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
		await expect(
			svc.getUploadStream({ mimeType: 'image/jpeg', access: 'public' } as any)
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
})
