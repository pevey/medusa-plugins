import * as zod from 'zod'
import { useEffect, useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { useBlocker } from 'react-router-dom'
import { Button, DatePicker, Drawer, Heading, Input, Label, toast, usePrompt } from '@medusajs/ui'
import { AdminContentItem } from '../types'
import { useUpdateContentItem } from '../hooks/content'
import { ContentItemMetadataFields } from './content-item-metadata-fields'

function sanitizeSlug(value: string) {
	return value
		.toLowerCase()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
		.replace(/-+/g, '-')
}

const schema = zod.object({
	title: zod.string().min(1, 'Title is required'),
	slug: zod.string().min(1, 'Slug is required').regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only')
})
type FormData = zod.infer<typeof schema>

type Props = {
	item: AdminContentItem
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const EditContentItemDrawer = ({ item, open, onOpenChange }: Props) => {
	const { mutate: updateItem, isPending } = useUpdateContentItem(item.content_collection?.id, item.id)
	const prompt = usePrompt()
	const [metadata, setMetadata] = useState<Record<string, unknown>>({})
	const [publishedAt, setPublishedAt] = useState<Date | undefined>(undefined)

	const metadataFields = item.content_collection?.content_fields ?? []
	const hasMetadataFields = metadataFields.length > 0 && item.content_collection?.format !== 'img'

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: { title: '', slug: '' }
	})

	const blocker = useBlocker(
		({ currentLocation, nextLocation }) =>
			open && form.formState.isDirty && currentLocation.pathname !== nextLocation.pathname
	)

	useEffect(() => {
		if (blocker.state === 'blocked') {
			prompt({
				title: 'Are you sure you want to leave this form?',
				description: 'You have unsaved changes that will be lost if you exit this form.',
				confirmText: 'Continue',
				cancelText: 'Cancel',
				variant: 'confirmation'
			}).then(confirmed => {
				if (blocker.state !== 'blocked') return
				if (confirmed) {
					blocker.proceed()
				} else {
					blocker.reset()
				}
			})
		}
	}, [blocker])

	useEffect(() => {
		if (item && open) {
			form.reset({ title: item.title, slug: item.slug })
			setMetadata((item.metadata as Record<string, unknown>) ?? {})
			setPublishedAt(item.published_at ? new Date(item.published_at) : undefined)
		}
	}, [item, open])

	const handleSubmit = form.handleSubmit(data => {
		updateItem(
			{
				...data,
				published_at: publishedAt ? publishedAt.toISOString() : null,
				...(hasMetadataFields ? { metadata } : {})
			},
			{
				onSuccess: () => {
					form.reset(data)
					onOpenChange(false)
					toast.success('Item updated')
				},
				onError: () => toast.error('Failed to update item')
			}
		)
	})

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<Drawer.Content>
				<form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-hidden">
					<Drawer.Header>
						<Heading level="h1">Edit Item</Heading>
					</Drawer.Header>
					<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-6 overflow-y-auto">
						<Controller
							control={form.control}
							name="title"
							rules={{ required: 'Title is required' }}
							render={({ field, fieldState }) => (
								<div className="flex flex-col space-y-2">
									<Label size="small" weight="plus">
										Title <span className="text-ui-fg-error">*</span>
									</Label>
									<Input {...field} placeholder="Item title" />
									{fieldState.error && (
										<span className="text-ui-fg-error text-sm">
											{fieldState.error.message}
										</span>
									)}
								</div>
							)}
						/>
						<Controller
							control={form.control}
							name="slug"
							rules={{ required: 'Slug is required' }}
							render={({ field, fieldState }) => (
								<div className="flex flex-col space-y-2">
									<Label size="small" weight="plus">
										Slug <span className="text-ui-fg-error">*</span>
									</Label>
									<Input
										{...field}
										placeholder="item-slug"
										onChange={e => field.onChange(sanitizeSlug(e.target.value))}
									/>
									{fieldState.error && (
										<span className="text-ui-fg-error text-sm">
											{fieldState.error.message}
										</span>
									)}
								</div>
							)}
						/>

						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Published At
							</Label>
							<DatePicker
								value={publishedAt}
								onChange={v => setPublishedAt(v ?? undefined)}
							/>
						</div>

						{hasMetadataFields && (
							<div className="flex flex-col gap-y-3">
								{/* <Heading level="h2">Fields</Heading> */}
								<ContentItemMetadataFields
									fields={metadataFields}
									value={metadata}
									onChange={setMetadata}
								/>
							</div>
						)}
					</Drawer.Body>
					<Drawer.Footer>
						<div className="flex items-center justify-end gap-x-2">
							<Drawer.Close asChild>
								<Button size="small" variant="secondary">
									Cancel
								</Button>
							</Drawer.Close>
							<Button size="small" type="submit" isLoading={isPending}>
								Save
							</Button>
						</div>
					</Drawer.Footer>
				</form>
			</Drawer.Content>
		</Drawer>
	)
}
