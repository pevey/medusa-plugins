import { useState } from 'react'
import { Button, Drawer, Heading, Input, Label, toast } from '@medusajs/ui'
import { useAddAffiliateAddress } from '../hooks/affiliates'

type Props = {
	affiliateId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const AddAffiliateAddressDrawer = ({ affiliateId, open, onOpenChange }: Props) => {
	const add = useAddAffiliateAddress(affiliateId)
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

	const reset = () => {
		setFirst('')
		setLast('')
		setCompany('')
		setA1('')
		setA2('')
		setCity('')
		setProvince('')
		setCountry('')
		setPostal('')
		setPhone('')
	}

	const submit = async () => {
		try {
			await add.mutateAsync({
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
			toast.success('Address added.')
			reset()
			onOpenChange(false)
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to add address.')
		}
	}

	return (
		<Drawer open={open} onOpenChange={onOpenChange}>
			<Drawer.Content>
				<Drawer.Header>
					<Heading>Add address</Heading>
				</Drawer.Header>
				<Drawer.Body className="p-6 grid grid-cols-2 gap-4">
					<div>
						<Label>First name</Label>
						<Input value={first} onChange={e => setFirst(e.target.value)} />
					</div>
					<div>
						<Label>Last name</Label>
						<Input value={last} onChange={e => setLast(e.target.value)} />
					</div>
					<div className="col-span-2">
						<Label>Company</Label>
						<Input value={company} onChange={e => setCompany(e.target.value)} />
					</div>
					<div className="col-span-2">
						<Label>Address 1</Label>
						<Input value={a1} onChange={e => setA1(e.target.value)} />
					</div>
					<div className="col-span-2">
						<Label>Address 2</Label>
						<Input value={a2} onChange={e => setA2(e.target.value)} />
					</div>
					<div>
						<Label>City</Label>
						<Input value={city} onChange={e => setCity(e.target.value)} />
					</div>
					<div>
						<Label>State/Province</Label>
						<Input value={province} onChange={e => setProvince(e.target.value)} />
					</div>
					<div>
						<Label>Country</Label>
						<Input value={country} onChange={e => setCountry(e.target.value.toLowerCase())} />
					</div>
					<div>
						<Label>Postal</Label>
						<Input value={postal} onChange={e => setPostal(e.target.value)} />
					</div>
					<div className="col-span-2">
						<Label>Phone</Label>
						<Input value={phone} onChange={e => setPhone(e.target.value)} />
					</div>
				</Drawer.Body>
				<Drawer.Footer>
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={submit} isLoading={add.isPending}>
						Add
					</Button>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer>
	)
}
