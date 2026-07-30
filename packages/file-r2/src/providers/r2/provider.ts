import {
	DeleteObjectCommand,
	DeleteObjectsCommand,
	GetObjectCommand,
	HeadObjectCommand,
	PutObjectCommand,
	S3Client,
	S3ClientConfigType
} from '@aws-sdk/client-s3'
import { Upload } from '@aws-sdk/lib-storage'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'
import { FileTypes, Logger } from '@medusajs/framework/types'
import { AbstractFileProviderService, MedusaError } from '@medusajs/framework/utils'
import path from 'path'
import { PassThrough, Readable, Writable } from 'stream'
import { ulid } from 'ulid'

/**
 * Sanitizes a file path by:
 * - Normalizing slashes to posix format
 * - Stripping leading slashes
 * - Resolving relative path segments (.)
 * - Removing path traversal segments (..)
 *
 * Copied verbatim from medusajs/medusa#16010 to stay aligned with the upstream
 * s3 provider. Guarantee relied on by callers: the result never begins with `..`,
 * so prepending a trusted prefix makes that prefix an inviolable root.
 */
export function sanitizeFilePath(filePath: string): string {
	const cleanPath = filePath.replace(/\\/g, '/').replace(/^\/+/, '')
	const normalizedPath = path.posix.normalize(cleanPath)
	return normalizedPath
		.split('/')
		.filter(segment => segment !== '..' && segment !== '.')
		.join('/')
}

/**
 * Encode an object key for use in a URL path. Preserved directory slashes must
 * stay literal `/`, so encode each segment independently rather than the whole
 * key (a whole-key encodeURIComponent would turn separators into %2F).
 */
export function encodeKeyForUrl(key: string): string {
	return key.split('/').map(encodeURIComponent).join('/')
}

/**
 * Decodes the string `content` of an uploaded file into a Buffer.
 *
 * Upload inputs arrive as a string that may be base64, UTF-8 text (e.g. a CSV
 * with special characters, see medusajs/medusa#13649) or a binary/latin1 string
 * (e.g. an image produced via `buffer.toString("binary")`, as the upload docs
 * instruct). Decoding a binary string as UTF-8 corrupts every byte > 127 (a
 * PNG's leading `0x89` becomes `0xC2 0x89`), so the encoding is chosen from the
 * file's MIME type, defaulting to binary for non-text content.
 */
function decodeFileContent(content: string, mimeType?: string): Buffer {
	const decodedBase64 = Buffer.from(content, 'base64')
	if (decodedBase64.toString('base64') === content) {
		return decodedBase64
	}

	const isTextContent = mimeType?.startsWith('text/') || mimeType?.includes('csv') || mimeType?.includes('json') || mimeType?.includes('xml')

	return isTextContent ? Buffer.from(content, 'utf8') : Buffer.from(content, 'binary')
}

/**
 * Cloudflare's R2 dashboard shows the S3 API endpoint with the bucket name
 * appended (with a copy button), e.g.
 * `https://<account>.r2.cloudflarestorage.com/my-bucket`. But the S3 client is
 * also given the bucket separately, so leaving it on the endpoint doubles it
 * into every object key (`my-bucket/my-bucket/<file>`). This returns the
 * endpoint with a trailing path segment equal to the bucket name removed;
 * otherwise it returns the endpoint unchanged.
 */
export function stripBucketFromEndpoint(endpoint: string | undefined, bucket: string | undefined): string | undefined {
	if (!endpoint || !bucket) {
		return endpoint
	}
	let url: URL
	try {
		url = new URL(endpoint)
	} catch {
		return endpoint
	}
	const segments = url.pathname.split('/').filter(Boolean)
	if (segments.length === 0 || segments[segments.length - 1] !== bucket) {
		return endpoint
	}
	segments.pop()
	return url.origin + (segments.length ? `/${segments.join('/')}` : '')
}

type InjectedDependencies = {
	logger: Logger
}

export interface R2FileProviderConfig {
	region: string
	bucket: string
	accessKeyId?: string
	secretAccessKey?: string
	fileUrl: string
	endpoint?: string
	globalPrefix?: string
	cacheControl?: string
	downloadFileDuration?: number
	additionalClientConfig?: Record<string, any>
	privateRegion?: string
	privateBucket?: string
	privateAccessKeyId?: string
	privateSecretAccessKey?: string
	privateEndpoint?: string
}

const DEFAULT_UPLOAD_EXPIRATION_DURATION_SECONDS = 60 * 60

export class R2FileProvider extends AbstractFileProviderService {
	static identifier = 'r2'
	protected config_: R2FileProviderConfig
	protected logger_: Logger
	protected client_: S3Client
	protected privateClient_: S3Client

	constructor({ logger }: InjectedDependencies, options: R2FileProviderConfig) {
		super()

		if (!options.accessKeyId || !options.secretAccessKey) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `Access key ID and secret access key are required when using access key authentication`)
		}

		this.config_ = {
			region: options.region,
			bucket: options.bucket,
			accessKeyId: options.accessKeyId,
			secretAccessKey: options.secretAccessKey,
			fileUrl: options.fileUrl,
			endpoint: options.endpoint,
			globalPrefix: options.globalPrefix ?? '',
			cacheControl: options.cacheControl ?? 'public, max-age=31536000',
			downloadFileDuration: options.downloadFileDuration ?? 60 * 60,
			additionalClientConfig: options.additionalClientConfig ?? {},
			// Private bucket options
			privateRegion: options.privateRegion,
			privateBucket: options.privateBucket,
			privateAccessKeyId: options.privateAccessKeyId,
			privateSecretAccessKey: options.privateSecretAccessKey,
			privateEndpoint: options.privateEndpoint
		}
		this.logger_ = logger
		this.config_.endpoint = this.normalizeEndpoint(this.config_.endpoint, this.config_.bucket)
		this.config_.privateEndpoint = this.normalizeEndpoint(this.config_.privateEndpoint, this.config_.privateBucket)
		this.client_ = this.getClient()
		this.privateClient_ = this.getClient(true)
	}

	/**
	 * Strip a trailing bucket-name path segment from an endpoint — a very common
	 * mistake because Cloudflare's dashboard offers a copy button for the endpoint
	 * with the bucket already appended. The S3 client is given the bucket
	 * separately, so leaving it on the endpoint doubles the bucket into every
	 * object path (`bucket/bucket/<file>`). We strip it and log that we did, so
	 * the change is visible in the logs.
	 */
	protected normalizeEndpoint(endpoint?: string, bucket?: string): string | undefined {
		const cleaned = stripBucketFromEndpoint(endpoint, bucket)
		if (endpoint && cleaned !== endpoint) {
			this.logger_.warn(
				`[medusa-plugin-r2] Stripped the bucket name "${bucket}" from the configured endpoint ` +
					`("${endpoint}" → "${cleaned}"). The R2 S3 API endpoint must be the account host only; ` +
					`the bucket is supplied separately via the bucket option. If you previously relied on the ` +
					`doubled path ("${bucket}/${bucket}/<file>"), migrate existing objects to the un-nested ` +
					`path or set the endpoint to keep the bucket segment intentionally.`
			)
		}
		return cleaned
	}

	protected getClient(priv: boolean = false): S3Client {
		if (priv) {
			if (!this.config_.privateAccessKeyId || !this.config_.privateSecretAccessKey || !this.config_.privateBucket || !this.config_.privateEndpoint) {
				throw new MedusaError(
					MedusaError.Types.INVALID_DATA,
					`Private bucket configuration is incomplete. Please provide privateAccessKeyId, privateSecretAccessKey, privateBucket, and privateEndpoint in the configuration.`
				)
			}
			const config: S3ClientConfigType = {
				credentials: {
					accessKeyId: this.config_.privateAccessKeyId!,
					secretAccessKey: this.config_.privateSecretAccessKey!
				},
				region: this.config_.privateRegion!,
				endpoint: this.config_.privateEndpoint!,
				...this.config_.additionalClientConfig
			}
			return new S3Client(config)
		}
		const config: S3ClientConfigType = {
			credentials: {
				accessKeyId: this.config_.accessKeyId!,
				secretAccessKey: this.config_.secretAccessKey!
			},
			region: this.config_.region,
			endpoint: this.config_.endpoint,
			...this.config_.additionalClientConfig
		}
		return new S3Client(config)
	}

	/**
	 * Sanitize the untrusted `prefix + filename` composite into a storage path,
	 * rejecting input that resolves to nothing (e.g. a traversal-only filename
	 * like `../..`, which would otherwise yield a degenerate `globalPrefix`-only
	 * key). Note: this is intentionally stricter than the upstream s3 provider
	 * (medusajs/medusa#16010), which silently accepts the empty result.
	 */
	protected sanitizeRequiredPath(prefix: string, filename: string): string {
		const sanitized = sanitizeFilePath(`${prefix}${filename}`)
		if (!sanitized) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `Filename "${filename}" resolves to an empty path after path traversal sanitization`)
		}
		return sanitized
	}

	async upload(file: FileTypes.ProviderUploadFileDTO & { prefix?: string }): Promise<FileTypes.ProviderFileResultDTO> {
		const prefix = file.prefix ?? ''
		if (!file) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No file provided`)
		}

		if (!file.filename) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No filename provided`)
		}

		const parsedFilename = path.posix.parse(this.sanitizeRequiredPath(prefix, file.filename))

		const fileKey = `${this.config_.globalPrefix}${parsedFilename.dir ? `${parsedFilename.dir}/` : ''}${parsedFilename.name}-${ulid()}${parsedFilename.ext}`

		const content = decodeFileContent(file.content, file.mimeType)

		const command = new PutObjectCommand({
			Bucket: file.access === 'public' ? this.config_.bucket : this.config_.privateBucket!,
			Body: content,
			Key: fileKey,
			ContentType: file.mimeType,
			CacheControl: this.config_.cacheControl,
			// Note: We could potentially set the content disposition when uploading,
			// but storing the original filename as metadata should suffice.
			Metadata: {
				'original-filename': encodeURIComponent(file.filename)
			}
		})

		try {
			const client = file.access === 'public' ? this.client_ : this.privateClient_
			await client.send(command)
		} catch (e) {
			this.logger_.error(e as Error)
			throw e
		}

		const url = file.access === 'public' ? `${this.config_.fileUrl}/${encodeKeyForUrl(fileKey)}` : ''

		return {
			url,
			key: fileKey
		}
	}

	async getUploadStream(fileData: FileTypes.ProviderUploadStreamDTO & { prefix?: string }): Promise<{
		writeStream: Writable
		promise: Promise<FileTypes.ProviderFileResultDTO>
		url: string
		fileKey: string
	}> {
		if (!fileData.filename) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No filename provided`)
		}

		const prefix = fileData.prefix ?? ''
		const parsedFilename = path.posix.parse(this.sanitizeRequiredPath(prefix, fileData.filename))
		const fileKey = `${this.config_.globalPrefix}${parsedFilename.dir ? `${parsedFilename.dir}/` : ''}${parsedFilename.name}-${ulid()}${parsedFilename.ext}`

		const pass = new PassThrough()

		const upload = new Upload({
			client: fileData.access === 'public' ? this.client_ : this.privateClient_,
			params: {
				Bucket: fileData.access === 'public' ? this.config_.bucket : this.config_.privateBucket!,
				Key: fileKey,
				Body: pass,
				ContentType: fileData.mimeType,
				CacheControl: this.config_.cacheControl,
				Metadata: {
					'original-filename': encodeURIComponent(fileData.filename)
				}
			}
		})
		const promise = upload.done().then(() => ({
			url: fileData.access === 'public' ? `${this.config_.fileUrl}/${encodeKeyForUrl(fileKey)}` : '',
			key: fileKey
		}))
		return {
			writeStream: pass,
			promise,
			url: fileData.access === 'public' ? `${this.config_.fileUrl}/${encodeKeyForUrl(fileKey)}` : '',
			fileKey
		}
	}

	async delete(files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]): Promise<void> {
		try {
			/**
			 * Bulk delete files
			 */
			if (Array.isArray(files)) {
				await this.client_.send(
					new DeleteObjectsCommand({
						Bucket: this.config_.bucket,
						Delete: {
							Objects: files.map(file => ({
								Key: file.fileKey
							})),
							Quiet: true
						}
					})
				)
			} else if (files.access === 'public') {
				await this.client_.send(
					new DeleteObjectCommand({
						Bucket: this.config_.bucket,
						Key: files.fileKey
					})
				)
			} else if (files.access === 'private') {
				await this.privateClient_.send(
					new DeleteObjectCommand({
						Bucket: this.config_.privateBucket!,
						Key: files.fileKey
					})
				)
			} else {
				// Access not specified — check which bucket has the file
				try {
					await this.client_.send(
						new HeadObjectCommand({
							Bucket: this.config_.bucket,
							Key: files.fileKey
						})
					)
					await this.client_.send(
						new DeleteObjectCommand({
							Bucket: this.config_.bucket,
							Key: files.fileKey
						})
					)
				} catch {
					await this.privateClient_.send(
						new DeleteObjectCommand({
							Bucket: this.config_.privateBucket!,
							Key: files.fileKey
						})
					)
				}
			}
		} catch (e) {
			// TODO: Rethrow depending on the error (eg. a file not found error is fine, but a failed request should be rethrown)
			this.logger_.error(e as Error)
		}
	}

	async deleteByUrl(url: string) {
		const fileKey = this.getFileKey(url)
		return await this.delete({ fileKey })
	}

	async getPresignedDownloadUrl(fileData: FileTypes.ProviderGetFileDTO): Promise<string> {
		// For r2, only the private bucket supports presigned urls
		if (fileData.access === 'public') {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `Presigned URLs are not supported for public files.`)
		}
		// TODO: Allow passing content disposition when getting a presigned URL
		const command = new GetObjectCommand({
			Bucket: this.config_.privateBucket!,
			Key: `${fileData.fileKey}`
		})
		return await getSignedUrl(this.privateClient_ as any, command as any, {
			expiresIn: this.config_.downloadFileDuration
		})
	}

	async getPresignedUploadUrl(fileData: FileTypes.ProviderGetPresignedUploadUrlDTO & { prefix?: string }): Promise<FileTypes.ProviderFileResultDTO> {
		// For r2, only the private bucket supports presigned urls
		if (fileData.access === 'public') {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `Presigned URLs are not supported for public files.`)
		}
		if (!fileData?.filename) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No filename provided`)
		}
		const prefix = fileData.prefix ?? ''
		const fileKey = `${this.config_.globalPrefix}${this.sanitizeRequiredPath(prefix, fileData.filename)}`
		const command = new PutObjectCommand({
			Bucket: this.config_.privateBucket!,
			ContentType: fileData.mimeType,
			Key: fileKey
		})
		const signedUrl = await getSignedUrl(this.privateClient_ as any, command as any, {
			expiresIn: fileData.expiresIn ?? DEFAULT_UPLOAD_EXPIRATION_DURATION_SECONDS
		})
		return {
			url: signedUrl,
			key: fileKey
		}
	}

	async getDownloadStream(file: FileTypes.ProviderGetFileDTO): Promise<Readable> {
		if (!file?.fileKey) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No fileKey provided`)
		}
		const fileKey = file.fileKey
		const client = file.access === 'public' ? this.client_ : this.privateClient_
		const response = await client.send(
			new GetObjectCommand({
				Key: fileKey,
				Bucket: file.access === 'public' ? this.config_.bucket : this.config_.privateBucket!
			})
		)
		return response.Body! as Readable
	}

	async getAsBuffer(file: FileTypes.ProviderGetFileDTO): Promise<Buffer> {
		if (!file?.fileKey) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No fileKey provided`)
		}
		const fileKey = file.fileKey
		const client = file.access === 'public' ? this.client_ : this.privateClient_
		const response = await client.send(
			new GetObjectCommand({
				Key: fileKey,
				Bucket: file.access === 'public' ? this.config_.bucket : this.config_.privateBucket!
			})
		)
		return Buffer.from(await response.Body!.transformToByteArray())
	}

	private getFileKey = (url: string) => {
		const parsedUrl = new URL(url)
		const basePath = new URL(this.config_.fileUrl).pathname
		const fullPath = parsedUrl.pathname

		const fileKeyPath = fullPath.startsWith(basePath) ? fullPath.slice(basePath.length) : fullPath
		const fileKey = fileKeyPath.startsWith('/') ? fileKeyPath.slice(1) : fileKeyPath
		return decodeURIComponent(fileKey)
	}
}
