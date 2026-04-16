import * as zod from 'zod'
import { useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
	Button,
	FocusModal,
	Heading,
	Input,
	Label,
	Select,
	Text,
	toast
} from '@medusajs/ui'
import { useCreateContentCollection } from '../hooks/content'
import { sdk } from '../lib/sdk'
import { ContentFieldsEditor, FieldInput } from './content-fields-editor'

const schema = zod.object({
	label: zod.string().min(1, 'Label is required'),
	slug: zod.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
	format: zod.string().min(1, 'Format is required'),
	prefix: zod.string().optional().default('')
})
type FormData = zod.infer<typeof schema>

const FORMAT_OPTIONS = [
	{ value: 'html', label: 'HTML' },
	{ value: 'img', label: 'Image' },
	{ value: 'json', label: 'JSON' },
	{ value: 'md', label: 'Markdown' },
	{ value: 'text', label: 'Plain Text' }
]

function toSlug(label: string) {
	return label
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

type Props = { open: boolean; onOpenChange: (open: boolean) => void }

export const CreateContentCollectionModal = ({ open, onOpenChange }: Props) => {
	const { mutateAsync: createContentCollection, isPending } = useCreateContentCollection()
	const slugManuallyEdited = useRef(false)
	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { label: '', slug: '', format: '', prefix: '' }
	})
	const [fields, setFields] = useState<FieldInput[]>([])

	const handleSubmit = form.handleSubmit(async data => {
		try {
			const { content_collection } = await createContentCollection({
				label: data.label,
				slug: data.slug,
				format: data.format,
				prefix: data.prefix || null
			})
			if (fields.length > 0) {
				await Promise.all(
					fields.map(f =>
						sdk.client.fetch(`/admin/content/${content_collection.id}/fields`, {
							method: 'POST',
							body: {
								name: f.name,
								label: f.label,
								field_type: f.field_type,
								required: f.required,
								sort_order: f.sort_order
							}
						})
					)
				)
			}
			toast.success(`Content collection "${data.label}" created`)
			form.reset()
			setFields([])
			slugManuallyEdited.current = false
			onOpenChange(false)
		} catch {
			toast.error('Failed to create content collection')
		}
	})

	return (
		<FocusModal open={open} onOpenChange={onOpenChange}>
			<FocusModal.Content>
				<form onSubmit={handleSubmit}>
					<FocusModal.Header>
						<Button type="submit" isLoading={isPending}>
							Save
						</Button>
					</FocusModal.Header>
					<FocusModal.Body className="flex flex-col items-center py-16">
						<div className="flex w-full max-w-2xl flex-col gap-y-8">
							<div>
								<Heading>Create Content Collection</Heading>
								<Text className="text-ui-fg-subtle mt-1">
									Define a new collection of content and how it should be stored.
								</Text>
							</div>
							<div className="flex flex-col gap-y-4">
								<div className="flex flex-col gap-y-1">
									<Label htmlFor="label" className="text-ui-fg-subtle">
										Label <span className="text-ui-fg-error">*</span>
									</Label>
									<Controller
										control={form.control}
										name="label"
										rules={{ required: 'Label is required' }}
										render={({ field, fieldState }) => (
											<>
												<Input
													{...field}
													id="label"
													placeholder="Blog Post"
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
									<Label htmlFor="slug" className="text-ui-fg-subtle">
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
													id="slug"
													placeholder="blog-post"
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
								<div className="flex flex-col gap-y-1">
									<Label className="text-ui-fg-subtle">
										Format <span className="text-ui-fg-error">*</span>
									</Label>
									<Controller
										control={form.control}
										name="format"
										rules={{ required: 'Format is required' }}
										render={({ field, fieldState }) => (
											<>
												<Select value={field.value} onValueChange={field.onChange}>
													<Select.Trigger>
														<Select.Value placeholder="Select format..." />
													</Select.Trigger>
													<Select.Content>
														{FORMAT_OPTIONS.map(opt => (
															<Select.Item key={opt.value} value={opt.value}>
																{opt.label}
															</Select.Item>
														))}
													</Select.Content>
												</Select>
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
									<Label htmlFor="prefix" className="text-ui-fg-subtle">
										Storage Prefix
									</Label>
									<Controller
										control={form.control}
										name="prefix"
										render={({ field }) => (
											<Input {...field} id="prefix" placeholder="blog/" />
										)}
									/>
									<Text className="text-ui-fg-muted text-sm">
										Optional path prefix used when uploading files of this collection (e.g.
										"blog/").
									</Text>
								</div>
							</div>

							<div className="flex flex-col gap-y-3">
								<div>
									<Heading level="h2">Fields</Heading>
									<Text className="text-ui-fg-subtle mt-1" size="small">
										Define the schema fields for this content collection.
									</Text>
								</div>
								<ContentFieldsEditor fields={fields} onChange={setFields} />
							</div>
						</div>
					</FocusModal.Body>
				</form>
			</FocusModal.Content>
		</FocusModal>
	)
}
