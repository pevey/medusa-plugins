// AES-256-GCM encryption for at-rest signing secrets.
//
// Stored format: `v1.<iv_b64>.<tag_b64>.<ciphertext_b64>`
// The version prefix lets us migrate algorithms in the future without
// touching existing rows. Base64 (standard, no padding) is used because
// the alphabet excludes `.`, which is reserved as the field separator.

import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto'

const VERSION = 'v1'
const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12   // 96 bits, GCM recommended
const TAG_LENGTH = 16  // 128 bits, GCM default

function b64(buf: Buffer): string {
	return buf.toString('base64').replace(/=+$/, '')
}

function fromB64(str: string): Buffer {
	return Buffer.from(str, 'base64')
}

export class Encryptor {
	private readonly key: Buffer

	constructor(secret: string) {
		if (!secret || typeof secret !== 'string' || secret.length < 16) {
			throw new Error(
				'Automation plugin requires an `automation.secret` option of at least 16 characters. ' +
				'Set it via the plugin options (typically from process.env.AUTOMATION_SECRET). ' +
				'Rotating this value will invalidate all stored signing secrets.'
			)
		}
		// Derive a fixed-length 32-byte key from the user-supplied secret.
		// SHA-256 is fine here: the secret is already high-entropy (env var),
		// we just need to normalize length for AES-256.
		this.key = createHash('sha256').update(secret, 'utf8').digest()
	}

	encrypt(plaintext: string): string {
		const iv = randomBytes(IV_LENGTH)
		// Casts to Uint8Array are needed because @types/node ships Buffer as
		// `Uint8Array<ArrayBufferLike>`, while the crypto signatures expect
		// `Uint8Array<ArrayBuffer>`. The runtime values are identical.
		const cipher = createCipheriv(ALGORITHM, new Uint8Array(this.key), new Uint8Array(iv))
		const ct = Buffer.concat([
			new Uint8Array(cipher.update(plaintext, 'utf8')),
			new Uint8Array(cipher.final())
		])
		const tag = cipher.getAuthTag()
		return `${VERSION}.${b64(iv)}.${b64(tag)}.${b64(ct)}`
	}

	decrypt(stored: string): string {
		if (typeof stored !== 'string' || !stored.startsWith(`${VERSION}.`)) {
			throw new Error(
				'Stored secret is not in the expected encrypted format. ' +
				'It may be a legacy plaintext value written before encryption was enabled — ' +
				'regenerate the affected signing secret or trigger signing key.'
			)
		}
		const parts = stored.split('.')
		if (parts.length !== 4) {
			throw new Error('Malformed encrypted secret')
		}
		const [, ivB64, tagB64, ctB64] = parts
		const iv = fromB64(ivB64)
		const tag = fromB64(tagB64)
		const ct = fromB64(ctB64)
		if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
			throw new Error('Malformed encrypted secret')
		}
		const decipher = createDecipheriv(ALGORITHM, new Uint8Array(this.key), new Uint8Array(iv))
		decipher.setAuthTag(new Uint8Array(tag))
		const pt = Buffer.concat([
			new Uint8Array(decipher.update(new Uint8Array(ct))),
			new Uint8Array(decipher.final())
		])
		return pt.toString('utf8')
	}
}
