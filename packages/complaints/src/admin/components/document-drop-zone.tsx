import { useRef, useState } from 'react'
import { Text, toast } from '@medusajs/ui'

/**
 * Client-side cap matching the default server-side `maxDocumentBytes`.
 * If the plugin is configured with a different `maxDocumentBytes` via
 * `ComplaintOptions`, update this constant in lockstep so the drop-zone
 * UI doesn't reject files the backend would actually accept (or vice versa).
 * Admin UI bundles can't read runtime plugin options.
 */
export const COMPLAINT_DOCUMENT_MAX_BYTES = 15 * 1024 * 1024
export const COMPLAINT_DOCUMENT_ACCEPTED_MIME_TYPES = [
	'application/pdf',
	'text/plain',
	'text/csv',
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'application/zip',
	'application/x-zip-compressed'
]
const ACCEPT_ATTR = COMPLAINT_DOCUMENT_ACCEPTED_MIME_TYPES.join(',')

type DocumentDropZoneProps = {
	onFilesSelected: (files: File[]) => void
	disabled?: boolean
}

const validateFiles = (files: File[]): { accepted: File[]; rejected: string[] } => {
	const accepted: File[] = []
	const rejected: string[] = []
	for (const file of files) {
		if (!COMPLAINT_DOCUMENT_ACCEPTED_MIME_TYPES.includes(file.type)) {
			rejected.push(`${file.name}: unsupported file type (${file.type || 'unknown'})`)
		} else if (file.size > COMPLAINT_DOCUMENT_MAX_BYTES) {
			rejected.push(`${file.name}: exceeds 15 MB limit`)
		} else {
			accepted.push(file)
		}
	}
	return { accepted, rejected }
}

export const DocumentDropZone = ({ onFilesSelected, disabled }: DocumentDropZoneProps) => {
	const fileInputRef = useRef<HTMLInputElement>(null)
	const [dragOver, setDragOver] = useState(false)

	const handle = (rawFiles: FileList | File[]) => {
		const { accepted, rejected } = validateFiles(Array.from(rawFiles))
		if (rejected.length) {
			toast.error(rejected.join('; '))
		}
		if (accepted.length) {
			onFilesSelected(accepted)
		}
	}

	return (
		<div
			className={`flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors ${
				disabled
					? 'border-ui-border-base bg-ui-bg-disabled cursor-not-allowed opacity-60'
					: dragOver
						? 'border-ui-border-interactive bg-ui-bg-highlight cursor-pointer'
						: 'border-ui-border-base bg-ui-bg-subtle hover:border-ui-border-strong cursor-pointer'
			}`}
			onClick={() => !disabled && fileInputRef.current?.click()}
			onDragOver={e => {
				e.preventDefault()
				if (!disabled) setDragOver(true)
			}}
			onDragLeave={() => setDragOver(false)}
			onDrop={e => {
				e.preventDefault()
				setDragOver(false)
				if (disabled) return
				if (e.dataTransfer.files.length) handle(e.dataTransfer.files)
			}}
		>
			<Text className="text-ui-fg-muted">Drop files here or click to browse</Text>
			<Text size="small" className="text-ui-fg-subtle mt-1">
				PDF, TXT, CSV, images, ZIP &mdash; up to 15 MB each
			</Text>
			<input
				ref={fileInputRef}
				type="file"
				multiple
				accept={ACCEPT_ATTR}
				className="hidden"
				disabled={disabled}
				onChange={e => {
					if (e.target.files?.length) handle(e.target.files)
					e.target.value = ''
				}}
			/>
		</div>
	)
}

export const formatFileSize = (bytes: number): string => {
	if (bytes < 1024) return `${bytes} B`
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}
