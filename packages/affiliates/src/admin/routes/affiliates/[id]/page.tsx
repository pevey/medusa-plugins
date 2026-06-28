import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Container, Heading, toast, usePrompt } from '@medusajs/ui'
import { useAffiliate, useDeleteAffiliates } from '../../../hooks/affiliates'
import { ActionMenu } from '../../../components/action-menu'
import { EditAffiliateDrawer } from '../../../components/edit-affiliate-drawer'
import { AffiliatePromotionsSection } from '../../../components/affiliate-promotions-section'
import { AffiliateAddressesSection } from '../../../components/affiliate-addresses-section'
import { AffiliateStatsSection } from '../../../components/affiliate-stats-section'

const STATUS_COLOR: Record<string, 'green' | 'orange' | 'grey'> = {
	active: 'green',
	restricted: 'orange',
	inactive: 'grey'
}

export const handle = { breadcrumb: () => 'Affiliate' }

const AffiliateDetailPage = () => {
	const { id = '' } = useParams()
	const navigate = useNavigate()
	const { data, isLoading } = useAffiliate(id)
	const deleteAffiliates = useDeleteAffiliates()
	const prompt = usePrompt()
	const [editOpen, setEditOpen] = useState(false)

	if (isLoading || !data) return <Container className="p-6">Loading…</Container>
	const affiliate = data.affiliate

	const onDelete = async () => {
		const confirmed = await prompt({
			title: 'Delete affiliate?',
			description: 'This will retire all their codes and remove their attribution history.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (!confirmed) return
		await deleteAffiliates.mutateAsync([id])
		toast.success('Affiliate deleted.')
		navigate('/affiliates')
	}

	return (
		<div className="flex flex-col gap-y-3">
			<Container className="p-6">
				<div className="flex items-start justify-between">
					<div>
						<Heading>{affiliate.name}</Heading>
						<div className="mt-1 flex items-center gap-2">
							<Badge size="xsmall" color={STATUS_COLOR[affiliate.status]}>
								{affiliate.status}
							</Badge>
							<span className="text-ui-fg-subtle text-sm">{affiliate.email}</span>
						</div>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="secondary" onClick={() => setEditOpen(true)}>
							Edit
						</Button>
						<ActionMenu groups={[{ actions: [{ label: 'Delete', onClick: onDelete }] }]} />
					</div>
				</div>
				<dl className="mt-6 grid grid-cols-3 gap-y-3 text-sm">
					<dt className="text-ui-fg-subtle">Phone</dt>
					<dd className="col-span-2">{affiliate.phone ?? '—'}</dd>
					<dt className="text-ui-fg-subtle">Currency</dt>
					<dd className="col-span-2">{affiliate.currency_code?.toUpperCase() ?? '—'}</dd>
					<dt className="text-ui-fg-subtle">Member since</dt>
					<dd className="col-span-2">{new Date(affiliate.created_at).toLocaleDateString()}</dd>
				</dl>
			</Container>

			<AffiliatePromotionsSection affiliate={affiliate} />
			<AffiliateAddressesSection affiliate={affiliate} />
			<AffiliateStatsSection affiliate={affiliate} />

			<EditAffiliateDrawer affiliate={affiliate} open={editOpen} onOpenChange={setEditOpen} />
		</div>
	)
}

export default AffiliateDetailPage
