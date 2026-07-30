import { useState } from 'react'
import { Badge, Button, Container, Heading, Table, toast, usePrompt } from '@medusajs/ui'
import { AdminAffiliate, AdminAffiliatePromotion } from '../types'
import { useRetireAffiliatePromotion, useReactivateAffiliatePromotion, useDeleteAffiliatePromotion } from '../hooks/affiliates'
import { ActionMenu } from './action-menu'
import { AddPromotionCodeModal } from './add-promotion-code-modal'
import { EditPromotionCodeDrawer } from './edit-promotion-code-drawer'

export const AffiliatePromotionsSection = ({ affiliate }: { affiliate: AdminAffiliate }) => {
	const promotions = affiliate.promotions ?? []
	const [addOpen, setAddOpen] = useState(false)
	const [editPromotion, setEditPromotion] = useState<AdminAffiliatePromotion | null>(null)
	const retire = useRetireAffiliatePromotion(affiliate.id)
	const reactivate = useReactivateAffiliatePromotion(affiliate.id)
	const del = useDeleteAffiliatePromotion(affiliate.id)
	const prompt = usePrompt()

	const onRetire = async (p: AdminAffiliatePromotion) => {
		const confirmed = await prompt({
			title: `Retire ${p.code}?`,
			description: 'Customers will no longer be able to use this code. Past attribution stays.',
			confirmText: 'Retire',
			cancelText: 'Cancel',
			variant: 'confirmation'
		})
		if (!confirmed) return
		await retire.mutateAsync(p.id)
		toast.success(`${p.code} retired.`)
	}

	const onReactivate = async (p: AdminAffiliatePromotion) => {
		await reactivate.mutateAsync(p.id)
		toast.success(`${p.code} reactivated.`)
	}

	const onDelete = async (p: AdminAffiliatePromotion) => {
		const confirmed = await prompt({
			title: `Delete ${p.code}?`,
			description: 'Only allowed if no orders have used this code.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (!confirmed) return
		try {
			await del.mutateAsync(p.id)
			toast.success(`${p.code} deleted.`)
		} catch (err: any) {
			toast.error(err?.message ?? 'Cannot delete code in use.')
		}
	}

	return (
		<Container className="p-6">
			<div className="mb-4 flex items-center justify-between">
				<Heading level="h2">Promotion codes</Heading>
				<Button onClick={() => setAddOpen(true)}>Add code</Button>
			</div>
			<Table>
				<Table.Header>
					<Table.Row>
						<Table.HeaderCell>Code</Table.HeaderCell>
						<Table.HeaderCell>Type</Table.HeaderCell>
						<Table.HeaderCell>Value</Table.HeaderCell>
						<Table.HeaderCell>End date</Table.HeaderCell>
						<Table.HeaderCell>Status</Table.HeaderCell>
						<Table.HeaderCell />
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{promotions.length === 0 && (
						<Table.Row>
							{/* @ts-ignore */}
							<Table.Cell colSpan={6}>No promotion codes.</Table.Cell>
						</Table.Row>
					)}
					{promotions.map(p => (
						<Table.Row key={p.id}>
							<Table.Cell>
								<span className="font-mono">{p.code}</span>
							</Table.Cell>
							<Table.Cell>{p.application_method?.type === 'percentage' ? '%' : 'Fixed'}</Table.Cell>
							<Table.Cell>{p.application_method?.value ?? '—'}</Table.Cell>
							<Table.Cell>{p.campaign?.ends_at ? new Date(p.campaign.ends_at).toLocaleDateString() : '—'}</Table.Cell>
							<Table.Cell>
								<Badge size="xsmall" color={p.status === 'active' ? 'green' : 'grey'}>
									{p.status}
								</Badge>
							</Table.Cell>
							<Table.Cell>
								<ActionMenu
									groups={[
										{
											actions: [
												{ label: 'Edit', onClick: () => setEditPromotion(p) },
												p.status === 'active'
													? { label: 'Retire', onClick: () => onRetire(p) }
													: { label: 'Reactivate', onClick: () => onReactivate(p) },
												{ label: 'Delete', onClick: () => onDelete(p) }
											]
										}
									]}
								/>
							</Table.Cell>
						</Table.Row>
					))}
				</Table.Body>
			</Table>
			<AddPromotionCodeModal affiliateId={affiliate.id} open={addOpen} onOpenChange={setAddOpen} />
			<EditPromotionCodeDrawer
				affiliateId={affiliate.id}
				promotion={editPromotion}
				open={editPromotion !== null}
				onOpenChange={v => {
					if (!v) setEditPromotion(null)
				}}
			/>
		</Container>
	)
}
