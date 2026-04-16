import * as zod from 'zod'
import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, FocusModal, Heading, Input, Label, Text, toast } from '@medusajs/ui'
import { AdminContentCollection } from '../types'
import { useCreateContentItem } from '../hooks/content'
import { sdk } from '../lib/sdk'
import { ContentItemMetadataFields } from './content-item-metadata-fields'

const schema = zod.object({
	title: zod.string().min(1, 'Title is required'),
	slug: zod.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only')
})
type FormData = zod.infer<typeof schema>

function toSlug(title: string) {
	return title
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-|-$/g, '')
}

function sanitizeSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
}

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	contentCollection: AdminContentCollection
}

export const CreateContentItemModal = ({ open, onOpenChange, contentCollection }: Props) => {
	const { mutate: createItem, isPending: isCreating } = useCreateContentItem(contentCollection.id)
	const [isUploading, setIsUploading] = useState(false)
	const [selectedFile, setSelectedFile] = useState<File | null>(null)
	const [dragOver, setDragOver] = useState(false)
	const [metadata, setMetadata] = useState<Record<string, unknown>>({})
	const fileInputRef = useRef<HTMLInputElement>(null)

	const isImg = contentCollection.format === 'img'
	const isPending = isCreating || isUploading
	const slugManuallyEdited = useRef(false)
	const metadataFields = contentCollection.content_fields ?? []
	const hasMetadataFields = metadataFields.length > 0 && !isImg

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { title: '', slug: '' }
	})

	const handleFileSelect = (file: File) => {
		setSelectedFile(file)
		const name = file.name.replace(/\.[^.]+$/, '')
		if (!form.getValues('title')) {
			form.setValue('title', name)
			form.setValue('slug', toSlug(name))
		}
	}

	const handleSubmit = form.handleSubmit(async data => {
		// Validate required metadata fields
		if (hasMetadataFields) {
			const missing = metadataFields.filter(
				f => f.required && (metadata[f.name] == null || metadata[f.name] === '')
			)
			if (missing.length > 0) {
				toast.error(`Required fields missing: ${missing.map(f => f.label).join(', ')}`)
				return
			}
		}

		if (isImg) {
			if (!selectedFile) {
				toast.error('Please select an image to upload')
				return
			}
			setIsUploading(true)
			try {
				const formData = new FormData()
				formData.append('files', selectedFile)
				const result = await sdk.client.fetch<{ files: { url: string; key: string }[] }>(
					`/admin/content/${contentCollection.id}/upload`,
					{ method: 'POST', body: formData, headers: { 'content-type': null } }
				)
				const url = result.files?.[0]?.url
				if (!url) throw new Error('Upload returned no URL')
				createItem(
					{ title: data.title, slug: data.slug, content_collection_id: contentCollection.id, body: url },
					{
						onSuccess: () => {
							toast.success('Image uploaded')
							form.reset()
							slugManuallyEdited.current = false
							setSelectedFile(null)
							onOpenChange(false)
						},
						onError: () => toast.error('Failed to create image item')
					}
				)
			} catch {
				toast.error('Upload failed')
			} finally {
				setIsUploading(false)
			}
		} else {
			createItem(
				{
					title: data.title,
					slug: data.slug,
					content_collection_id: contentCollection.id,
					metadata: hasMetadataFields ? metadata : undefined
				},
				{
					onSuccess: () => {
						toast.success(`"${data.title}" created`)
						form.reset()
						setMetadata({})
						slugManuallyEdited.current = false
						onOpenChange(false)
					},
					onError: () => toast.error('Failed to create item')
				}
			)
		}
	})

	return (
		<FocusModal open={open} onOpenChange={onOpenChange}>
			<FocusModal.Content>
				<form onSubmit={handleSubmit}>
					<FocusModal.Header>
						<Button type="submit" isLoading={isPending}>
							{isImg ? 'Upload' : 'Create'}
						</Button>
					</FocusModal.Header>
					<FocusModal.Body className="flex flex-col items-center py-16">
						<div className="flex w-full max-w-lg flex-col gap-y-8">
							<div>
								<Heading>{isImg ? 'Upload Image' : `Create ${contentCollection.label}`}</Heading>
								<Text className="text-ui-fg-subtle mt-1">
									{isImg
										? 'Upload an image and give it a title and slug.'
										: 'Give this item a title and slug. You can edit the body on the next screen.'}
								</Text>
							</div>

							{isImg && (
								<div className="flex flex-col gap-y-2">
									<Label className="text-ui-fg-subtle">Image</Label>
									<div
										className={`flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-8 transition-colors ${
											dragOver
												? 'border-ui-border-interactive bg-ui-bg-highlight'
												: 'border-ui-border-base bg-ui-bg-subtle hover:border-ui-border-strong'
										}`}
										onClick={() => fileInputRef.current?.click()}
										onDragOver={e => {
											e.preventDefault()
											setDragOver(true)
										}}
										onDragLeave={() => setDragOver(false)}
										onDrop={e => {
											e.preventDefault()
											setDragOver(false)
											const file = e.dataTransfer.files[0]
											if (file?.type.startsWith('image/')) handleFileSelect(file)
										}}
									>
										{selectedFile ? (
											<>
												<img
													src={URL.createObjectURL(selectedFile)}
													alt="Preview"
													className="mb-3 max-h-48 rounded object-contain"
												/>
												<Text size="small" className="text-ui-fg-subtle">
													{selectedFile.name}
												</Text>
											</>
										) : (
											<>
												<Text className="text-ui-fg-muted">
													Drop an image here or click to browse
												</Text>
												<Text size="small" className="text-ui-fg-subtle mt-1">
													JPG, PNG, GIF, WebP, SVG
												</Text>
											</>
										)}
									</div>
									<input
										ref={fileInputRef}
										type="file"
										accept="image/*"
										className="hidden"
										onChange={e => {
											const file = e.target.files?.[0]
											if (file) handleFileSelect(file)
										}}
									/>
								</div>
							)}

							<div className="flex flex-col gap-y-4">
								<div className="flex flex-col gap-y-1">
									<Label htmlFor="item-title" className="text-ui-fg-subtle">
										Title <span className="text-ui-fg-error">*</span>
									</Label>
									<Controller
										control={form.control}
										name="title"
										rules={{ required: 'Title is required' }}
										render={({ field, fieldState }) => (
											<>
												<Input
													{...field}
													id="item-title"
													placeholder="My item title"
													onChange={e => {
														field.onChange(e)
														if (!slugManuallyEdited.current) {
															form.setValue('slug', toSlug(e.target.value))
														}
													}}
												/>
												{fieldState.error && (
													<Text className="text-ui-fg-error text-sm">
														{fieldState.error.message}
													</Text>
												)}
											</>
										)}
									/>
								</div>
								<div className="flex flex-col gap-y-1">
									<Label htmlFor="item-slug" className="text-ui-fg-subtle">
										Slug <span className="text-ui-fg-error">*</span>
									</Label>
									<Controller
										control={form.control}
										name="slug"
										rules={{ required: 'Slug is required' }}
										render={({ field, fieldState }) => (
											<>
												<Input
													{...field}
													id="item-slug"
													placeholder="my-item-title"
													onChange={e => {
														slugManuallyEdited.current = true
														field.onChange(sanitizeSlug(e.target.value))
													}}
												/>
												{fieldState.error && (
													<Text className="text-ui-fg-error text-sm">
														{fieldState.error.message}
													</Text>
												)}
											</>
										)}
									/>
								</div>
							</div>

							{hasMetadataFields && (
								<div className="flex flex-col gap-y-3">
									<div>
										<Heading level="h2">Fields</Heading>
										<Text className="text-ui-fg-subtle mt-1" size="small">
											Fill in the fields defined for this content collection.
										</Text>
									</div>
									<ContentItemMetadataFields
										fields={metadataFields}
										value={metadata}
										onChange={setMetadata}
									/>
								</div>
							)}
						</div>
					</FocusModal.Body>
				</form>
			</FocusModal.Content>
		</FocusModal>
	)
}
