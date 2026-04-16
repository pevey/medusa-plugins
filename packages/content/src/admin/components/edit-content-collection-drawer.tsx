import * as zod from 'zod'
import { useEffect, useRef, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Button, Drawer, Heading, Input, Label, Text, toast } from '@medusajs/ui'
import { AdminContentCollection } from '../types'
import { useUpdateContentCollection } from '../hooks/content'
import { sdk } from '../lib/sdk'
import { ContentFieldsEditor, FieldInput } from './content-fields-editor'

function sanitizeSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
}

const schema = zod.object({
	label: zod.string().min(1, 'Label is required'),
	slug: zod.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
	prefix: zod.string().optional().default('')
})
type FormData = zod.infer<typeof schema>

type Props = {
	contentCollection: AdminContentCollection | undefined
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const EditContentCollectionDrawer = ({ contentCollection, open, onOpenChange }: Props) => {
	const { mutateAsync: updateContentCollection, isPending } = useUpdateContentCollection(
		contentCollection?.id ?? ''
	)
	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { label: '', slug: '', prefix: '' }
	})
	const [fields, setFields] = useState<FieldInput[]>([])
	const originalFields = useRef<AdminContentCollection['content_fields']>([])

	useEffect(() => {
		if (contentCollection) {
			form.reset({
				label: contentCollection.label,
				slug: contentCollection.slug,
				prefix: contentCollection.prefix ?? ''
			})
			const mapped: FieldInput[] = (contentCollection.content_fields ?? []).map(cf => ({
				_key: cf.id,
				id: cf.id,
				name: cf.name,
				label: cf.label,
				field_type: cf.field_type,
				required: cf.required,
				sort_order: cf.sort_order
			}))
			setFields(mapped)
			originalFields.current = contentCollection.content_fields ?? []
		}
	}, [contentCollection?.id])

	const handleSubmit = form.handleSubmit(async data => {
		const collectionId = contentCollection!.id
		try {
			await updateContentCollection({
				label: data.label,
				slug: data.slug,
				prefix: data.prefix || null
			})

			const origById = new Map((originalFields.current ?? []).map(f => [f.id, f]))
			const currentById = new Map(fields.filter(f => f.id).map(f => [f.id!, f]))

			// Delete removed fields
			const deletedIds = [...origById.keys()].filter(id => !currentById.has(id))
			if (deletedIds.length > 0) {
				await sdk.client.fetch(`/admin/content/${collectionId}/fields`, {
					method: 'DELETE',
					body: { ids: deletedIds }
				})
			}

			// Create new fields
			const newFields = fields.filter(f => !f.id)
			await Promise.all(
				newFields.map(f =>
					sdk.client.fetch(`/admin/content/${collectionId}/fields`, {
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

			// Update changed fields
			for (const [id, current] of currentById) {
				const orig = origById.get(id)
				if (!orig) continue
				if (
					current.label !== orig.label ||
					current.field_type !== orig.field_type ||
					current.required !== orig.required ||
					current.sort_order !== orig.sort_order
				) {
					await sdk.client.fetch(`/admin/content/${collectionId}/fields/${id}`, {
						method: 'POST',
						body: {
							label: current.label,
							field_type: current.field_type,
							required: current.required,
							sort_order: current.sort_order
						}
					})
				}
			}

			toast.success('Content collection updated')
			onOpenChange(false)
		} catch {
			toast.error('Failed to update content collection')
		}
	})

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<Drawer.Content>
				<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
					<Drawer.Header>
						<Heading>Edit Content Collection</Heading>
					</Drawer.Header>
					<Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
						<div className="flex flex-col gap-y-4">
							<div className="flex flex-col gap-y-1">
								<Label htmlFor="edit-label" className="text-ui-fg-subtle">
									Label
								</Label>
								<Controller
									control={form.control}
									name="label"
									rules={{ required: 'Label is required' }}
									render={({ field }) => (
										<Input {...field} id="edit-label" placeholder="Blog Post" />
									)}
								/>
							</div>
							<div className="flex flex-col gap-y-1">
								<Label htmlFor="edit-slug" className="text-ui-fg-subtle">
									Slug
								</Label>
								<Controller
									control={form.control}
									name="slug"
									rules={{ required: 'Slug is required' }}
									render={({ field }) => (
										<Input
											{...field}
											id="edit-slug"
											placeholder="blog-post"
											onChange={e => field.onChange(sanitizeSlug(e.target.value))}
										/>
									)}
								/>
							</div>
							<div className="flex flex-col gap-y-1">
								<Label htmlFor="edit-prefix" className="text-ui-fg-subtle">
									Storage Prefix
								</Label>
								<Controller
									control={form.control}
									name="prefix"
									render={({ field }) => (
										<Input {...field} id="edit-prefix" placeholder="blog/" />
									)}
								/>
								<Text className="text-ui-fg-muted text-sm">
									Path prefix used when uploading files of this collection.
								</Text>
							</div>
						</div>

						<div className="flex flex-col gap-y-3">
							<div>
								<Heading level="h2">Fields</Heading>
								<Text className="text-ui-fg-subtle mt-1" size="small">
									Schema fields for this content collection.
								</Text>
							</div>
							<ContentFieldsEditor fields={fields} onChange={setFields} />
						</div>
					</Drawer.Body>
					<Drawer.Footer>
						<Button variant="secondary" type="button" onClick={() => onOpenChange(false)}>
							Cancel
						</Button>
						<Button type="submit" isLoading={isPending}>
							Save
						</Button>
					</Drawer.Footer>
				</form>
			</Drawer.Content>
		</Drawer>
	)
}
