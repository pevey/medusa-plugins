import { useEffect, useState } from 'react'
import { Button, Drawer, Heading, Input, Label, Select, toast, usePrompt } from '@medusajs/ui'
import { AdminAffiliate, AdminAffiliateStatus } from '../types'
import { useUpdateAffiliate } from '../hooks/affiliates'

type Props = {
	affiliate: AdminAffiliate
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const EditAffiliateDrawer = ({ affiliate, open, onOpenChange }: Props) => {
	const update = useUpdateAffiliate(affiliate.id)
	const prompt = usePrompt()
	const [name, setName] = useState(affiliate.name)
	const [email, setEmail] = useState(affiliate.email)
	const [phone, setPhone] = useState(affiliate.phone ?? '')
	const [currency, setCurrency] = useState(affiliate.currency_code ?? '')
	const [status, setStatus] = useState<AdminAffiliateStatus>(affiliate.status)

	useEffect(() => {
		if (open) {
			setName(affiliate.name)
			setEmail(affiliate.email)
			setPhone(affiliate.phone ?? '')
			setCurrency(affiliate.currency_code ?? '')
			setStatus(affiliate.status)
		}
	}, [open, affiliate])

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		const activeCount = (affiliate.promotions ?? []).filter(p => p.status === 'active').length
		if (status === 'inactive' && affiliate.status !== 'inactive' && activeCount > 0) {
			const confirmed = await prompt({
				title: 'Set affiliate to inactive?',
				description: `${activeCount} active promotion code${activeCount === 1 ? '' : 's'} will be deactivated. You can reactivate them individually later.`,
				confirmText: 'Set inactive',
				cancelText: 'Cancel',
				variant: 'confirmation'
			})
			if (!confirmed) return
		}
		try {
			await update.mutateAsync({
				name,
				email,
				phone: phone || null,
				currency_code: currency || null,
				status
			})
			toast.success('Affiliate updated.')
			onOpenChange(false)
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to update.')
		}
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<Drawer.Content>
				<form onSubmit={submit} className="flex flex-1 flex-col overflow-hidden">
					<Drawer.Header>
						<Drawer.Title asChild>
							<Heading level="h1">Edit affiliate</Heading>
						</Drawer.Title>
						<Drawer.Description className="sr-only">Edit this affiliate's name, contact details, currency, and status.</Drawer.Description>
					</Drawer.Header>
					<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Name
							</Label>
							<Input value={name} onChange={e => setName(e.target.value)} />
						</div>
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Email
							</Label>
							<Input value={email} onChange={e => setEmail(e.target.value)} />
						</div>
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Phone
							</Label>
							<Input value={phone} onChange={e => setPhone(e.target.value)} />
						</div>
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Currency
							</Label>
							<Input value={currency} onChange={e => setCurrency(e.target.value.toLowerCase())} placeholder="usd" />
						</div>
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Status
							</Label>
							<Select value={status} onValueChange={v => setStatus(v as AdminAffiliateStatus)}>
								<Select.Trigger>
									<Select.Value />
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="active">Active</Select.Item>
									<Select.Item value="restricted">Restricted</Select.Item>
									<Select.Item value="inactive">Inactive</Select.Item>
								</Select.Content>
							</Select>
						</div>
					</Drawer.Body>
					<Drawer.Footer>
						<div className="flex items-center justify-end gap-x-2">
							<Drawer.Close asChild>
								<Button size="small" variant="secondary">
									Cancel
								</Button>
							</Drawer.Close>
							<Button size="small" type="submit" disabled={update.isPending} isLoading={update.isPending}>
								Save
							</Button>
						</div>
					</Drawer.Footer>
				</form>
			</Drawer.Content>
		</Drawer>
	)
}
