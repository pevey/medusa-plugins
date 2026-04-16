import { useState } from 'react'
import { Link, LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash, ArrowUpRightOnBox } from '@medusajs/icons'
import { ContentFormat } from '../../../types'
import { useContentCollection, useDeleteContentCollections } from '../../../hooks/content'
import { ActionMenu } from '../../../components/action-menu'
import { EditContentCollectionDrawer } from '../../../components/edit-content-collection-drawer'
import { sdk } from '../../../lib/sdk'

type ContentCollectionLoaderData = { content_collection: { id: string; label: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { collectionId } = params
	return sdk.client.fetch<ContentCollectionLoaderData>(`/admin/content/${collectionId}`, {
		query: { fields: 'id,label' }
	})
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<ContentCollectionLoaderData>) =>
		data?.content_collection?.label || data?.content_collection?.id || 'Collection'
}

const FORMAT_LABELS: Record<ContentFormat, string> = {
	html: 'HTML',
	img: 'Image',
	json: 'JSON',
	md: 'Markdown',
	text: 'Text'
}

const FORMAT_COLORS: Record<ContentFormat, 'blue' | 'green' | 'orange' | 'purple' | 'grey'> = {
	html: 'orange',
	img: 'blue',
	json: 'purple',
	md: 'green',
	text: 'grey'
}

const RELATIONSHIP_TYPE_LABELS: Record<string, string> = {
	many_to_many: 'Many ↔ Many',
	one_to_many: 'One → Many',
	many_to_one: 'Many → One'
}

const ContentCollectionDetailPage = () => {
	const { collectionId } = useParams<{ collectionId: string }>()
	const navigate = useNavigate()
	const prompt = usePrompt()
	const [editOpen, setEditOpen] = useState(false)

	const { data, isLoading } = useContentCollection(collectionId)
	const { mutate: deleteContentCollections } = useDeleteContentCollections()

	const contentCollection = data?.content_collection

	const handleDelete = async () => {
		const confirmed = await prompt({
			title: `Delete "${contentCollection?.label}"?`,
			description: 'This will permanently delete the content collection and all its items.',
			confirmText: 'Delete',
			cancelText: 'Cancel'
		})
		if (confirmed) {
			deleteContentCollections([collectionId!], {
				onSuccess: () => {
					toast.success('Content collection deleted')
					navigate('/content')
				},
				onError: () => toast.error('Failed to delete content collection')
			})
		}
	}

	if (isLoading) {
		return (
			<Container className="p-6">
				<Text className="text-ui-fg-muted">Loading...</Text>
			</Container>
		)
	}

	if (!contentCollection) {
		return (
			<Container className="p-6">
				<Text className="text-ui-fg-error">Content collection not found.</Text>
			</Container>
		)
	}

	const fmt = contentCollection.format as ContentFormat
	const allRelationships = [
		...(contentCollection.source_relationships ?? []),
		...(contentCollection.target_relationships ?? [])
	]

	return (
		<div className="flex flex-col gap-y-4">
			{/* Header */}
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<div className="flex items-center gap-x-3">
						<Heading>{contentCollection.label}</Heading>
						<Badge size="small" color={FORMAT_COLORS[fmt] ?? 'grey'}>
							{FORMAT_LABELS[fmt] ?? fmt}
						</Badge>
					</div>
					<ActionMenu
						groups={[
							{
								actions: [
									{
										label: 'Edit',
										icon: <PencilSquare />,
										onClick: () => setEditOpen(true)
									},
									{ label: 'Delete', icon: <Trash />, onClick: handleDelete }
								]
							}
						]}
					/>
				</div>

				{/* Details */}
				<div className="grid grid-cols-2 items-center px-6 py-3">
					<Text className="text-ui-fg-subtle" size="small">
						Slug
					</Text>
					<Text className="font-mono text-sm">{contentCollection.slug}</Text>
				</div>
				<div className="grid grid-cols-2 items-center px-6 py-3">
					<Text className="text-ui-fg-subtle" size="small">
						Items
					</Text>
					<div>
						{' '}
						<Link to={`/content/${collectionId}/items`}>
							<Button size="small">
								<ArrowUpRightOnBox className="ml-2" />
								Manage Items
							</Button>
						</Link>
					</div>
				</div>
				{contentCollection.prefix && (
					<div className="grid grid-cols-2 items-center px-6 py-3">
						<Text className="text-ui-fg-subtle" size="small">
							Storage Prefix
						</Text>
						<Text className="font-mono text-sm">{contentCollection.prefix}</Text>
					</div>
				)}
			</Container>

			{/* Content Fields */}
			<Container className="divide-y p-0">
				<div className="px-6 py-4">
					<Heading level="h2">Fields</Heading>
					<Text className="text-ui-fg-subtle mt-1" size="small">
						Schema fields defined for this content collection.
					</Text>
				</div>
				{(contentCollection.content_fields?.length ?? 0) === 0 ? (
					<div className="px-6 py-4">
						<Text className="text-ui-fg-muted" size="small">
							No fields defined.
						</Text>
					</div>
				) : (
					contentCollection.content_fields?.map(field => (
						<div key={field.id} className="grid grid-cols-3 items-center px-6 py-3">
							<Text size="small" weight="plus">
								{field.label}
							</Text>
							<Text className="text-ui-fg-muted font-mono text-sm">{field.name}</Text>
							<div className="flex items-center gap-x-2">
								<Badge size="xsmall" color="grey">
									{field.field_type}
								</Badge>
								{field.required && (
									<Badge size="xsmall" color="orange">
										required
									</Badge>
								)}
							</div>
						</div>
					))
				)}
			</Container>

			{/* Relationships */}
			{allRelationships.length > 0 && (
				<Container className="divide-y p-0">
					<div className="px-6 py-4">
						<Heading level="h2">Related Collections</Heading>
						<Text className="text-ui-fg-subtle mt-1" size="small">
							Content collections this collection is related to.
						</Text>
					</div>
					{allRelationships.map(rel => {
						const isSource = rel.source_collection_id === collectionId
						const other = isSource ? rel.target_collection : rel.source_collection
						return (
							<div key={rel.id} className="flex items-center justify-between px-6 py-3">
								<div className="flex items-center gap-x-3">
									<Badge size="xsmall" color="grey">
										{RELATIONSHIP_TYPE_LABELS[rel.relationship_type]}
									</Badge>
									<Link
										to={`/content/${other.id}`}
										className="text-ui-fg-interactive hover:text-ui-fg-interactive-hover text-sm"
									>
										{other.label}
									</Link>
								</div>
								<Text className="text-ui-fg-muted text-sm">
									{isSource ? 'outgoing' : 'incoming'}
								</Text>
							</div>
						)
					})}
				</Container>
			)}

			<EditContentCollectionDrawer
				contentCollection={contentCollection}
				open={editOpen}
				onOpenChange={setEditOpen}
			/>
		</div>
	)
}

export default ContentCollectionDetailPage
