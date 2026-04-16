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

type InjectedDependencies = {
	logger: Logger
}

interface R2FileProviderConfig {
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
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Access key ID and secret access key are required when using access key authentication`
			)
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
		this.client_ = this.getClient()
		this.privateClient_ = this.getClient(true)
	}

	protected getClient(priv: boolean = false): S3Client {
		if (priv) {
			if (
				!this.config_.privateAccessKeyId ||
				!this.config_.privateSecretAccessKey ||
				!this.config_.privateBucket ||
				!this.config_.privateEndpoint
			) {
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

	async upload(
		file: FileTypes.ProviderUploadFileDTO & { prefix?: string }
	): Promise<FileTypes.ProviderFileResultDTO> {
		const prefix = file.prefix ?? ''
		if (!file) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No file provided`)
		}

		if (!file.filename) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No filename provided`)
		}

		const parsedFilename = path.parse(file.filename)

		const fileKey = `${this.config_.globalPrefix}${prefix}${parsedFilename.name}-${ulid()}${parsedFilename.ext}`

		let content: Buffer
		try {
			const decoded = Buffer.from(file.content, 'base64')
			if (decoded.toString('base64') === file.content) {
				content = decoded
			} else {
				content = Buffer.from(file.content, 'utf8')
			}
		} catch {
			// Last-resort fallback: binary
			content = Buffer.from(file.content, 'binary')
		}

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

		const url =
			file.access === 'public' ? `${this.config_.fileUrl}/${encodeURIComponent(fileKey)}` : ''

		return {
			url,
			key: fileKey
		}
	}

	async getUploadStream(
		fileData: FileTypes.ProviderUploadStreamDTO & { prefix?: string }
	): Promise<{
		writeStream: Writable
		promise: Promise<FileTypes.ProviderFileResultDTO>
		url: string
		fileKey: string
	}> {
		if (!fileData.filename) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No filename provided`)
		}

		const prefix = fileData.prefix ?? ''
		const parsedFilename = path.parse(fileData.filename)
		const fileKey = `${this.config_.globalPrefix}${prefix}${parsedFilename.name}-${ulid()}${parsedFilename.ext}`

		const pass = new PassThrough()

		const upload = new Upload({
			client: fileData.access === 'public' ? this.client_ : this.privateClient_,
			params: {
				Bucket:
					fileData.access === 'public' ? this.config_.bucket : this.config_.privateBucket!,
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
			url: fileData.access === 'public' ? `${this.config_.fileUrl}/${fileKey}` : '',
			key: fileKey
		}))
		return {
			writeStream: pass,
			promise,
			url: `${this.config_.fileUrl}/${fileKey}`,
			fileKey
		}
	}

	async delete(
		files: FileTypes.ProviderDeleteFileDTO | FileTypes.ProviderDeleteFileDTO[]
	): Promise<void> {
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
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Presigned URLs are not supported for public files.`
			)
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

	async getPresignedUploadUrl(
		fileData: FileTypes.ProviderGetPresignedUploadUrlDTO
	): Promise<FileTypes.ProviderFileResultDTO> {
		// For r2, only the private bucket supports presigned urls
		if (fileData.access === 'public') {
			throw new MedusaError(
				MedusaError.Types.INVALID_DATA,
				`Presigned URLs are not supported for public files.`
			)
		}
		if (!fileData?.filename) {
			throw new MedusaError(MedusaError.Types.INVALID_DATA, `No filename provided`)
		}
		const fileKey = `${this.config_.globalPrefix}${fileData.filename}`
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
