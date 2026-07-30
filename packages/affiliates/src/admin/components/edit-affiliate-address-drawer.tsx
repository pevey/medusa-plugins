import { useEffect, useState } from 'react'
import { Button, Drawer, Heading, Input, Label, toast } from '@medusajs/ui'
import { AdminAffiliateAddress } from '../types'
import { useUpdateAffiliateAddress } from '../hooks/affiliates'

type Props = {
	affiliateId: string
	address: AdminAffiliateAddress | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const EditAffiliateAddressDrawer = ({ affiliateId, address, open, onOpenChange }: Props) => {
	const update = useUpdateAffiliateAddress(affiliateId, address?.id ?? '')
	const [first, setFirst] = useState('')
	const [last, setLast] = useState('')
	const [company, setCompany] = useState('')
	const [a1, setA1] = useState('')
	const [a2, setA2] = useState('')
	const [city, setCity] = useState('')
	const [province, setProvince] = useState('')
	const [country, setCountry] = useState('')
	const [postal, setPostal] = useState('')
	const [phone, setPhone] = useState('')

	useEffect(() => {
		if (!open || !address) return
		setFirst(address.first_name ?? '')
		setLast(address.last_name ?? '')
		setCompany(address.company ?? '')
		setA1(address.address_1 ?? '')
		setA2(address.address_2 ?? '')
		setCity(address.city ?? '')
		setProvince(address.province ?? '')
		setCountry(address.country_code ?? '')
		setPostal(address.postal_code ?? '')
		setPhone(address.phone ?? '')
	}, [open, address])

	if (!address) return null

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			await update.mutateAsync({
				first_name: first || null,
				last_name: last || null,
				company: company || null,
				address_1: a1 || null,
				address_2: a2 || null,
				city: city || null,
				province: province || null,
				country_code: country || null,
				postal_code: postal || null,
				phone: phone || null
			} as any)
			toast.success('Address updated.')
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
							<Heading level="h1">Edit address</Heading>
						</Drawer.Title>
						<Drawer.Description className="sr-only">Edit this affiliate's address.</Drawer.Description>
					</Drawer.Header>
					<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
						<div className="grid grid-cols-2 gap-4">
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									First name
								</Label>
								<Input value={first} onChange={e => setFirst(e.target.value)} />
							</div>
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Last name
								</Label>
								<Input value={last} onChange={e => setLast(e.target.value)} />
							</div>
							<div className="col-span-2 flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Company
								</Label>
								<Input value={company} onChange={e => setCompany(e.target.value)} />
							</div>
							<div className="col-span-2 flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Address 1
								</Label>
								<Input value={a1} onChange={e => setA1(e.target.value)} />
							</div>
							<div className="col-span-2 flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Address 2
								</Label>
								<Input value={a2} onChange={e => setA2(e.target.value)} />
							</div>
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									City
								</Label>
								<Input value={city} onChange={e => setCity(e.target.value)} />
							</div>
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									State/Province
								</Label>
								<Input value={province} onChange={e => setProvince(e.target.value)} />
							</div>
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Country
								</Label>
								<Input value={country} onChange={e => setCountry(e.target.value.toLowerCase())} />
							</div>
							<div className="flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Postal
								</Label>
								<Input value={postal} onChange={e => setPostal(e.target.value)} />
							</div>
							<div className="col-span-2 flex flex-col space-y-2">
								<Label size="small" weight="plus">
									Phone
								</Label>
								<Input value={phone} onChange={e => setPhone(e.target.value)} />
							</div>
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
