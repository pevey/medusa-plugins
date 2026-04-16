import { useEffect, useState } from 'react'
import { FocusModal, Heading, Input, Select, Text } from '@medusajs/ui'
import { useContentCollections, useContentItems } from '../hooks/content'
import { AdminContentCollection, AdminContentItem } from '../types'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onSelect: (imgHtml: string) => void
}

export const InsertImageModal = ({ open, onOpenChange, onSelect }: Props) => {
	const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>()
	const [search, setSearch] = useState('')

	const { data: collectionsData } = useContentCollections({ limit: 100 })
	const imgCollections: AdminContentCollection[] = (
		collectionsData?.content_collections ?? []
	).filter((t: AdminContentCollection) => t.format === 'img')

	useEffect(() => {
		if (open && imgCollections.length > 0 && !selectedCollectionId) {
			setSelectedCollectionId(imgCollections[0].id)
		}
		if (!open) setSearch('')
	}, [open, imgCollections.length])

	const { data: itemsData, isLoading } = useContentItems(
		selectedCollectionId,
		selectedCollectionId ? { limit: 100, q: search || undefined } : {}
	)
	const items: AdminContentItem[] = (itemsData?.content_items ?? []).filter(
		(i: AdminContentItem) => i.body
	)

	const handleImageClick = (e: React.MouseEvent<HTMLImageElement>, url: string) => {
		const img = e.currentTarget
		const w = img.naturalWidth || 300
		const h = img.naturalHeight || 200
		onSelect(`<img src="${url}" width="${w}" height="${h}" />`)
		onOpenChange(false)
	}

	return (
		<FocusModal open={open} onOpenChange={onOpenChange}>
			<FocusModal.Content>
				<FocusModal.Header>
					<Heading>Insert Image</Heading>
				</FocusModal.Header>
				<FocusModal.Body className="flex flex-col gap-4 overflow-hidden p-6">
					{imgCollections.length === 0 ? (
						<Text className="text-ui-fg-muted">No image content collections found.</Text>
					) : (
						<>
							<div className="flex items-center gap-2">
								{imgCollections.length > 1 && (
									<Select
										value={selectedCollectionId ?? ''}
										onValueChange={setSelectedCollectionId}
									>
										<Select.Trigger className="w-48">
											<Select.Value placeholder="Select image library..." />
										</Select.Trigger>
										<Select.Content>
											{imgCollections.map(t => (
												<Select.Item key={t.id} value={t.id}>
													{t.label}
												</Select.Item>
											))}
										</Select.Content>
									</Select>
								)}
								<Input
									type="search"
									placeholder="Search images..."
									value={search}
									onChange={e => setSearch(e.target.value)}
									className="w-48 md:w-64"
								/>
							</div>

							{isLoading ? (
								<Text className="text-ui-fg-muted">Loading...</Text>
							) : items.length === 0 ? (
								<Text className="text-ui-fg-muted">
									{search ? 'No images match your search.' : 'No images in this library.'}
								</Text>
							) : (
								<div className="flex flex-wrap gap-4 overflow-y-auto">
									{items.map(item => (
										<div
											key={item.id}
											className="flex-none flex flex-col cursor-pointer rounded-lg border border-ui-border-base bg-ui-bg-subtle overflow-hidden hover:border-ui-border-interactive transition-colors"
										>
											<img
												src={item.body!}
												alt={item.title}
												className="block h-40 w-auto object-contain"
												onClick={e => handleImageClick(e, item.body!)}
											/>
											<div className="w-0 min-w-full overflow-hidden px-2 py-1">
												<Text size="xsmall" className="text-ui-fg-subtle truncate">
													{item.title}
												</Text>
											</div>
										</div>
									))}
								</div>
							)}
						</>
					)}
				</FocusModal.Body>
			</FocusModal.Content>
		</FocusModal>
	)
}
