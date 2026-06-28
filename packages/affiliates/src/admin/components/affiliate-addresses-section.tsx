import { useState } from 'react'
import { Badge, Button, Container, Heading, toast, usePrompt } from '@medusajs/ui'
import { AdminAffiliate, AdminAffiliateAddress } from '../types'
import { useDeleteAffiliateAddress, useSetPrimaryAffiliateAddress } from '../hooks/affiliates'
import { ActionMenu } from './action-menu'
import { AddAffiliateAddressDrawer } from './add-affiliate-address-drawer'
import { EditAffiliateAddressDrawer } from './edit-affiliate-address-drawer'

const formatAddress = (a: AdminAffiliateAddress) => {
	const lines = [
		[a.first_name, a.last_name].filter(Boolean).join(' '),
		a.company,
		a.address_1,
		a.address_2,
		[a.city, a.province, a.postal_code].filter(Boolean).join(', '),
		a.country_code?.toUpperCase()
	].filter(Boolean)
	return lines.join(' • ')
}

export const AffiliateAddressesSection = ({ affiliate }: { affiliate: AdminAffiliate }) => {
	const addresses = affiliate.addresses ?? []
	const setPrimary = useSetPrimaryAffiliateAddress(affiliate.id)
	const del = useDeleteAffiliateAddress(affiliate.id)
	const prompt = usePrompt()
	const [addOpen, setAddOpen] = useState(false)
	const [editAddress, setEditAddress] = useState<AdminAffiliateAddress | null>(null)

	const onSetPrimary = async (a: AdminAffiliateAddress) => {
		await setPrimary.mutateAsync(a.id)
		toast.success('Primary address updated.')
	}
	const onDelete = async (a: AdminAffiliateAddress) => {
		const confirmed = await prompt({
			title: 'Delete address?',
			description: '',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (!confirmed) return
		try {
			await del.mutateAsync(a.id)
			toast.success('Address deleted.')
		} catch (err: any) {
			toast.error(err?.message ?? 'Cannot delete primary address.')
		}
	}

	return (
		<Container className="p-6">
			<div className="flex items-center justify-between mb-4">
				<Heading level="h2">Addresses</Heading>
				<Button onClick={() => setAddOpen(true)}>Add address</Button>
			</div>
			<div className="flex flex-col gap-y-3">
				{addresses.length === 0 && <div className="text-ui-fg-subtle">No addresses.</div>}
				{addresses.map(a => (
					<div key={a.id} className="flex items-center justify-between border rounded-md p-3">
						<div className="flex flex-col">
							<div className="flex items-center gap-2">
								{a.id === affiliate.primary_address_id && (
									<Badge size="xsmall" color="green">
										Primary
									</Badge>
								)}
								<span>{formatAddress(a)}</span>
							</div>
						</div>
						<ActionMenu
							groups={[
								{
									actions: [
										{
											label: 'Set as primary',
											onClick: () => onSetPrimary(a),
											disabled: a.id === affiliate.primary_address_id
										},
										{ label: 'Edit', onClick: () => setEditAddress(a) },
										{ label: 'Delete', onClick: () => onDelete(a) }
									]
								}
							]}
						/>
					</div>
				))}
			</div>
			<AddAffiliateAddressDrawer
				affiliateId={affiliate.id}
				open={addOpen}
				onOpenChange={setAddOpen}
			/>
			<EditAffiliateAddressDrawer
				affiliateId={affiliate.id}
				address={editAddress}
				open={editAddress !== null}
				onOpenChange={v => {
					if (!v) setEditAddress(null)
				}}
			/>
		</Container>
	)
}
