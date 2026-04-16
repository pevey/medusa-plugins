import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { ChevronLeft, ChevronRight, ImageSparkle } from '@medusajs/icons'
import { Badge, Button, Container, Heading, Input, Select, Text } from '@medusajs/ui'
import { AdminContentItem, AdminContentCollection } from '../../types'
import { useContentCollections, useContentItems } from '../../hooks/content'

export const config = defineRouteConfig({
	label: 'Image Gallery',
	icon: ImageSparkle,
	rank: 7
})
export const handle = { breadcrumb: () => 'Image Gallery' }

const STATUS_COLORS: Record<string, 'green' | 'orange' | 'grey'> = {
	published: 'green',
	draft: 'orange',
	archived: 'grey'
}

const PAGE_SIZE = 48

const ImageGalleryPage = () => {
	const navigate = useNavigate()
	const [selectedCollectionId, setSelectedCollectionId] = useState<string | undefined>()
	const [search, setSearch] = useState('')
	const [pageIndex, setPageIndex] = useState(0)

	const { data: collectionsData } = useContentCollections({ limit: 100 })
	const imgCollections: AdminContentCollection[] = (
		collectionsData?.content_collections ?? []
	).filter((t: AdminContentCollection) => t.format === 'img')

	useEffect(() => {
		if (imgCollections.length > 0 && !selectedCollectionId) {
			setSelectedCollectionId(imgCollections[0].id)
		}
	}, [imgCollections.length])

	// Reset to page 0 on collection or search change
	useEffect(() => {
		setPageIndex(0)
	}, [selectedCollectionId, search])

	const offset = useMemo(() => pageIndex * PAGE_SIZE, [pageIndex])

	const { data: itemsData, isLoading } = useContentItems(
		selectedCollectionId,
		selectedCollectionId ? { limit: PAGE_SIZE, offset, q: search || undefined } : {}
	)
	const items: AdminContentItem[] = itemsData?.content_items ?? []
	const total = itemsData?.count ?? 0
	const pageCount = Math.ceil(total / PAGE_SIZE)

	return (
		<Container className="divide-y p-0">
			{/* Header */}
			<div className="flex flex-col items-start justify-between gap-2 px-6 py-4 md:flex-row md:items-center">
				<Heading>Image Gallery</Heading>
				<div className="flex items-center gap-2">
					<Input
						type="search"
						placeholder="Search images..."
						value={search}
						onChange={e => setSearch(e.target.value)}
						className="w-48 md:w-64"
					/>
					{imgCollections.length > 1 && (
						<Select
							value={selectedCollectionId ?? ''}
							onValueChange={setSelectedCollectionId}
						>
							<Select.Trigger className="w-48">
								<Select.Value placeholder="Select library..." />
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
				</div>
			</div>

			{/* Body */}
			{imgCollections.length === 0 ? (
				<Text className="px-6 py-8 text-center text-ui-fg-muted">
					No image content collections found.
				</Text>
			) : isLoading ? (
				<Text className="px-6 py-4 text-ui-fg-muted">Loading...</Text>
			) : items.length === 0 ? (
				<Text className="px-6 py-8 text-center text-ui-fg-muted">
					{search ? 'No images match your search.' : 'No images in this library.'}
				</Text>
			) : (
				<div className="flex flex-wrap gap-4 p-6">
					{items.map(item => (
						<div
							key={item.id}
							className="group flex-none flex flex-col cursor-pointer overflow-hidden rounded-lg border border-ui-border-base bg-ui-bg-subtle"
							onClick={() => navigate(`/content/${selectedCollectionId}/items/${item.id}`)}
						>
							{item.body ? (
								<img
									src={item.body}
									alt={item.title}
									className="block h-40 w-auto object-contain bg-ui-bg-component transition-transform group-hover:scale-105"
								/>
							) : (
								<div className="flex h-40 w-32 items-center justify-center bg-ui-bg-component">
									<Text className="text-sm text-ui-fg-muted">No image</Text>
								</div>
							)}
							<div className="w-0 min-w-full overflow-hidden p-2">
								<Text size="small" weight="plus" className="truncate">
									{item.title}
								</Text>
								<Badge
									size="xsmall"
									color={STATUS_COLORS[item.status] ?? 'grey'}
									className="mt-1"
								>
									{item.status}
								</Badge>
							</div>
						</div>
					))}
				</div>
			)}

			{/* Pagination */}
			{pageCount > 1 && (
				<div className="flex items-center justify-between px-6 py-3">
					<Text size="small" className="text-ui-fg-muted">
						{offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
					</Text>
					<div className="flex items-center gap-1">
						<Button
							size="small"
							variant="transparent"
							disabled={pageIndex === 0}
							onClick={() => setPageIndex(p => p - 1)}
						>
							<ChevronLeft />
						</Button>
						<Text size="small" className="min-w-[4rem] text-center text-ui-fg-subtle">
							{pageIndex + 1} / {pageCount}
						</Text>
						<Button
							size="small"
							variant="transparent"
							disabled={pageIndex >= pageCount - 1}
							onClick={() => setPageIndex(p => p + 1)}
						>
							<ChevronRight />
						</Button>
					</div>
				</div>
			)}
		</Container>
	)
}

export default ImageGalleryPage
