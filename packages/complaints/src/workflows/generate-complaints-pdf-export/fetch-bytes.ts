import type { ComplaintForExport, DocumentBytes } from './types'

type Provider = {
	getAsBuffer?: (args: { fileKey: string; access?: string }) => Promise<Buffer>
	getDownloadStream?: (args: { fileKey: string; access?: string }) => Promise<NodeJS.ReadableStream>
	getPresignedDownloadUrl?: (args: { fileKey: string; access?: string }) => Promise<string>
}

const CONCURRENCY = 4

export async function fetchDocumentBytes(
	provider: Provider,
	complaints: ComplaintForExport[]
): Promise<Record<string, DocumentBytes>> {
	const tasks: Array<{ id: string; fileKey: string }> = []
	for (const c of complaints) {
		for (const d of c.complaint.documents) {
			tasks.push({ id: d.id, fileKey: d.file_key })
		}
	}

	const out: Record<string, DocumentBytes> = {}
	let cursor = 0

	async function worker() {
		while (cursor < tasks.length) {
			const i = cursor++
			const t = tasks[i]
			try {
				const buf = await fetchOne(provider, t.fileKey)
				out[t.id] = { document_id: t.id, bytes: buf }
			} catch (e) {
				const reason = e instanceof Error ? e.message : String(e)
				out[t.id] = { document_id: t.id, bytes: null, error: reason }
			}
		}
	}

	const workers = Array.from({ length: Math.min(CONCURRENCY, tasks.length) }, () => worker())
	await Promise.all(workers)
	return out
}

async function fetchOne(provider: Provider, fileKey: string): Promise<Buffer> {
	if (typeof provider.getAsBuffer === 'function') {
		return provider.getAsBuffer({ fileKey, access: 'private' })
	}
	if (typeof provider.getDownloadStream === 'function') {
		const stream = await provider.getDownloadStream({ fileKey, access: 'private' })
		return streamToBuffer(stream)
	}
	if (typeof provider.getPresignedDownloadUrl === 'function') {
		const url = await provider.getPresignedDownloadUrl({ fileKey, access: 'private' })
		const res = await fetch(url)
		if (!res.ok) throw new Error(`HTTP ${res.status} fetching ${fileKey}`)
		const ab = await res.arrayBuffer()
		return Buffer.from(ab)
	}
	throw new Error('No supported method on file provider')
}

function streamToBuffer(stream: NodeJS.ReadableStream): Promise<Buffer> {
	return new Promise((resolve, reject) => {
		const chunks: Uint8Array[] = []
		stream.on('data', (chunk: Buffer | string) => {
			const u8 = typeof chunk === 'string' ? Buffer.from(chunk) : chunk
			chunks.push(u8 as unknown as Uint8Array)
		})
		stream.on('end', () => resolve(Buffer.concat(chunks as readonly Uint8Array[])))
		stream.on('error', reject)
	})
}
