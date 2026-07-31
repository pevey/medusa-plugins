import { cloneElement, isValidElement, useState, type ReactElement } from 'react'
import { Button, FocusModal, Heading, Input, Label, RadioGroup, Text, toast } from '@medusajs/ui'
import { useCreateAffiliate } from '../hooks/affiliates'

type Props = {
	open: boolean
	onOpenChange: (open: boolean) => void
	onCreated: (affiliateId: string) => void
}

export const CreateAffiliateModal = ({ open, onOpenChange, onCreated }: Props) => {
	const create = useCreateAffiliate()
	const [name, setName] = useState('')
	const [email, setEmail] = useState('')
	const [phone, setPhone] = useState('')
	const [currencyCode, setCurrencyCode] = useState('')
	// Address
	const [first, setFirst] = useState('')
	const [last, setLast] = useState('')
	const [company, setCompany] = useState('')
	const [a1, setA1] = useState('')
	const [a2, setA2] = useState('')
	const [city, setCity] = useState('')
	const [province, setProvince] = useState('')
	const [country, setCountry] = useState('')
	const [postal, setPostal] = useState('')
	const [aPhone, setAPhone] = useState('')
	// Promotion
	const [code, setCode] = useState('')
	const [discountType, setDiscountType] = useState<'percentage' | 'fixed'>('percentage')
	const [discountValue, setDiscountValue] = useState<string>('10')
	const [endDate, setEndDate] = useState<string>('')

	const reset = () => {
		setName('')
		setEmail('')
		setPhone('')
		setCurrencyCode('')
		setFirst('')
		setLast('')
		setCompany('')
		setA1('')
		setA2('')
		setCity('')
		setProvince('')
		setCountry('')
		setPostal('')
		setAPhone('')
		setCode('')
		setDiscountType('percentage')
		setDiscountValue('10')
		setEndDate('')
	}

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			const result = await create.mutateAsync({
				name,
				email,
				phone: phone || null,
				currency_code: currencyCode || null,
				address: {
					first_name: first || null,
					last_name: last || null,
					company: company || null,
					address_1: a1 || null,
					address_2: a2 || null,
					city: city || null,
					province: province || null,
					country_code: country || null,
					postal_code: postal || null,
					phone: aPhone || null
				},
				first_promotion: {
					code,
					discount_type: discountType,
					discount_value: Number(discountValue),
					end_date: endDate ? new Date(endDate).toISOString() : null
				}
			} as any)
			toast.success(`Affiliate ${name} created.`)
			reset()
			onOpenChange(false)
			onCreated((result as any).affiliate.affiliate_id)
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to create affiliate.')
		}
	}

	const field = (label: string, id: string, input: ReactElement) => (
		<div className="flex flex-col space-y-2">
			<Label htmlFor={id} size="small" weight="plus">
				{label}
			</Label>
			{isValidElement(input) ? cloneElement(input, { id } as any) : input}
		</div>
	)

	return (
		<FocusModal open={open} onOpenChange={onOpenChange}>
			<FocusModal.Content>
				<form onSubmit={submit} className="flex h-full flex-col overflow-hidden">
					<FocusModal.Header>
						<div className="flex items-center justify-end gap-x-2">
							<FocusModal.Close asChild>
								<Button size="small" variant="secondary">
									Cancel
								</Button>
							</FocusModal.Close>
							<Button type="submit" size="small" isLoading={create.isPending} disabled={create.isPending}>
								Save
							</Button>
						</div>
					</FocusModal.Header>
					<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
						<div className="mx-auto flex w-full max-w-[720px] flex-col gap-y-8 px-2 py-16">
							<div>
								<FocusModal.Title asChild>
									<Heading className="capitalize">Create Affiliate</Heading>
								</FocusModal.Title>
								<FocusModal.Description className="sr-only">
									Create a new affiliate: enter their details, primary address, and first promotion code.
								</FocusModal.Description>
							</div>

							<div className="grid grid-cols-1 gap-4">
								{field('Name', 'ca-name', <Input value={name} onChange={e => setName(e.target.value)} />)}
								{field('Email', 'ca-email', <Input type="email" value={email} onChange={e => setEmail(e.target.value)} />)}
								{field('Phone', 'ca-phone', <Input value={phone} onChange={e => setPhone(e.target.value)} />)}
								{field(
									'Currency',
									'ca-currency',
									<Input value={currencyCode} onChange={e => setCurrencyCode(e.target.value.toLowerCase())} placeholder="usd" />
								)}
							</div>

							<div className="flex flex-col gap-y-4">
								<Heading level="h2">Primary address</Heading>
								<div className="grid grid-cols-1 gap-4">
									<div className="grid grid-cols-2 gap-4">
										{field('First name', 'ca-first-name', <Input value={first} onChange={e => setFirst(e.target.value)} />)}
										{field('Last name', 'ca-last-name', <Input value={last} onChange={e => setLast(e.target.value)} />)}
									</div>
									{field('Company', 'ca-company', <Input value={company} onChange={e => setCompany(e.target.value)} />)}
									{field('Address 1', 'ca-address-1', <Input value={a1} onChange={e => setA1(e.target.value)} />)}
									{field('Address 2', 'ca-address-2', <Input value={a2} onChange={e => setA2(e.target.value)} />)}
									<div className="grid grid-cols-2 gap-4">
										{field('City', 'ca-city', <Input value={city} onChange={e => setCity(e.target.value)} />)}
										{field('State / Province', 'ca-province', <Input value={province} onChange={e => setProvince(e.target.value)} />)}
									</div>
									<div className="grid grid-cols-2 gap-4">
										{field(
											'Country code',
											'ca-country',
											<Input value={country} onChange={e => setCountry(e.target.value.toLowerCase())} placeholder="us" />
										)}
										{field('Postal code', 'ca-postal', <Input value={postal} onChange={e => setPostal(e.target.value)} />)}
									</div>
									{field('Phone', 'ca-address-phone', <Input value={aPhone} onChange={e => setAPhone(e.target.value)} />)}
								</div>
							</div>

							<div className="flex flex-col gap-y-4">
								<Heading level="h2">First promotion code</Heading>
								<div className="grid grid-cols-1 gap-4">
									<div className="grid grid-cols-2 gap-4">
										{field('Code', 'ca-code', <Input value={code} onChange={e => setCode(e.target.value)} placeholder="JANE10" />)}
										{field(
											'Discount value',
											'ca-discount-value',
											<Input type="number" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
										)}
									</div>
									<div className="flex flex-col space-y-2">
										<Text size="small" weight="plus">
											Discount type
										</Text>
										<RadioGroup value={discountType} onValueChange={v => setDiscountType(v as any)} className="flex flex-row gap-x-6">
											<div className="flex items-center gap-x-2">
												<RadioGroup.Item value="percentage" id="dt-pct" />
												<Label htmlFor="dt-pct" size="small" className="cursor-pointer">
													Percentage
												</Label>
											</div>
											<div className="flex items-center gap-x-2">
												<RadioGroup.Item value="fixed" id="dt-fix" />
												<Label htmlFor="dt-fix" size="small" className="cursor-pointer">
													Fixed amount
												</Label>
											</div>
										</RadioGroup>
									</div>
									{field(
										'End date (optional)',
										'ca-end-date',
										<Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
									)}
								</div>
							</div>
						</div>
					</FocusModal.Body>
				</form>
			</FocusModal.Content>
		</FocusModal>
	)
}
