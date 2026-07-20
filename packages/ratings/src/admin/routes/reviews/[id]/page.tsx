import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { sdk } from '../../../lib/sdk'
import { ActionMenu } from '../../../components/action-menu'
import { useReview, useUpdateReview, useDeleteReview } from '../../../hooks/reviews'
import { ReviewStatus } from '../../../types'

type ReviewLoaderData = { review: { id: string; author_name: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<ReviewLoaderData>(`/admin/reviews/${id}`, {
		query: { fields: 'id,author_name' }
	})
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<ReviewLoaderData>) =>
		data?.review?.author_name || data?.review?.id || 'Review'
}

const STATUS_COLORS: Record<ReviewStatus, 'blue' | 'green' | 'red'> = {
	pending: 'blue',
	approved: 'green',
	rejected: 'red'
}

const STATUS_LABELS: Record<ReviewStatus, string> = {
	pending: 'Pending',
	approved: 'Approved',
	rejected: 'Rejected'
}

const ReviewDetailPage = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useReview(id)
	const { mutate: updateReview, isPending: isUpdating } = useUpdateReview(id!)
	const { mutate: deleteReview } = useDeleteReview()

	const review = data?.review

	const handleApprove = () => {
		updateReview(
			{ status: 'approved' },
			{
				onSuccess: () => toast.success('Review approved'),
				onError: () => toast.error('Failed to approve review')
			}
		)
	}

	const handleReject = () => {
		updateReview(
			{ status: 'rejected' },
			{
				onSuccess: () => toast.success('Review rejected'),
				onError: () => toast.error('Failed to reject review')
			}
		)
	}

	const handleDelete = async () => {
		const confirmed = await prompt({
			title: 'Delete review?',
			description: 'This action cannot be undone.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (confirmed) {
			deleteReview(review!.id, {
				onSuccess: () => {
					toast.success('Review deleted')
					navigate('/reviews')
				},
				onError: () => toast.error('Failed to delete review')
			})
		}
	}

	if (isLoading) return <Container className="p-6"><Text>Loading…</Text></Container>
	if (!review) return <Container className="p-6"><Text>Review not found.</Text></Container>

	const fields: [string, React.ReactNode][] = [
		['Status', <Badge size="xsmall" color={STATUS_COLORS[review.status]}>{STATUS_LABELS[review.status]}</Badge>],
		['Rating', `${review.rating} / 5`],
		['Author', review.author_name],
		...(review.author_email ? [['Email', review.author_email] as [string, React.ReactNode]] : []),
		...(review.title ? [['Title', review.title] as [string, React.ReactNode]] : []),
		['Review', <span className="whitespace-pre-wrap">{review.body}</span>],
		...(review.product_id ? [['Product ID', <span className="font-mono text-xs">{review.product_id}</span>] as [string, React.ReactNode]] : []),
		...(review.order_id ? [['Order ID', <span className="font-mono text-xs">{review.order_id}</span>] as [string, React.ReactNode]] : []),
		...(review.customer_id ? [['Customer ID', <span className="font-mono text-xs">{review.customer_id}</span>] as [string, React.ReactNode]] : []),
		['Received', new Date(review.created_at).toLocaleString()]
	]

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Review</Heading>
					<div className="flex items-center gap-2">
						{review.status === 'pending' && (
							<>
								<Button
									size="small"
									variant="secondary"
									onClick={handleReject}
									disabled={isUpdating}
								>
									Reject
								</Button>
								<Button
									size="small"
									variant="primary"
									onClick={handleApprove}
									disabled={isUpdating}
								>
									Approve
								</Button>
							</>
						)}
						<ActionMenu
							groups={[
								{
									actions: [
										{ label: 'Delete', icon: <Trash />, onClick: handleDelete }
									]
								}
							]}
						/>
					</div>
				</div>

				{fields.map(([label, value]) => (
					<div key={label} className="text-ui-fg-subtle grid grid-cols-[180px_1fr] items-start px-6 py-4">
						<Text size="small" weight="plus" leading="compact">
							{label}
						</Text>
						<Text size="small" leading="compact" as="div">
							{value}
						</Text>
					</div>
				))}
			</Container>

			{review.activity && review.activity.length > 0 && (
				<Container className="divide-y p-0">
					<div className="px-6 py-4">
						<Heading level="h2">Activity</Heading>
					</div>
					{review.activity.map(entry => (
						<div key={entry.id} className="flex flex-col gap-1 px-6 py-4">
							<div className="flex items-center gap-2">
								<Badge size="xsmall" color="grey">
									{entry.type}
								</Badge>
								<Text size="xsmall" className="text-ui-fg-muted">
									{new Date(entry.created_at).toLocaleString()}
								</Text>
							</div>
							{entry.note && (
								<Text size="small" className="text-ui-fg-subtle">
									{entry.note}
								</Text>
							)}
						</div>
					))}
				</Container>
			)}
		</div>
	)
}

export default ReviewDetailPage
