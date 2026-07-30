import { useState } from 'react'
import { Button, FocusModal, Heading, Input, Label, RadioGroup, toast } from '@medusajs/ui'
import { useAddAffiliatePromotion } from '../hooks/affiliates'

type Props = {
	affiliateId: string
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const AddPromotionCodeModal = ({ affiliateId, open, onOpenChange }: Props) => {
	const add = useAddAffiliatePromotion(affiliateId)
	const [code, setCode] = useState('')
	const [type, setType] = useState<'percentage' | 'fixed'>('percentage')
	const [value, setValue] = useState<string>('10')
	const [endDate, setEndDate] = useState('')

	const submit = async () => {
		try {
			await add.mutateAsync({
				code,
				discount_type: type,
				discount_value: Number(value),
				end_date: endDate ? new Date(endDate).toISOString() : null
			} as any)
			toast.success(`Promotion code ${code} created.`)
			setCode('')
			setValue('10')
			setEndDate('')
			onOpenChange(false)
		} catch (err: any) {
			toast.error(err?.message ?? 'Failed to create code.')
		}
	}

	return (
		<FocusModal open={open} onOpenChange={onOpenChange}>
			<FocusModal.Content>
				<FocusModal.Header>
					<FocusModal.Title asChild>
						<Heading>Add promotion code</Heading>
					</FocusModal.Title>
					<FocusModal.Description className="sr-only">Add a promotion code: set its code, discount value, and discount type.</FocusModal.Description>
				</FocusModal.Header>
				<FocusModal.Body className="grid grid-cols-2 gap-4 p-6">
					<div>
						<Label>Code</Label>
						<Input value={code} onChange={e => setCode(e.target.value)} />
					</div>
					<div>
						<Label>Discount value</Label>
						<Input type="number" value={value} onChange={e => setValue(e.target.value)} />
					</div>
					<div className="col-span-2">
						<Label>Discount type</Label>
						<RadioGroup value={type} onValueChange={v => setType(v as any)}>
							<RadioGroup.Item value="percentage" id="apt-pct" />
							<Label htmlFor="apt-pct">Percentage</Label>
							<RadioGroup.Item value="fixed" id="apt-fix" />
							<Label htmlFor="apt-fix">Fixed amount</Label>
						</RadioGroup>
					</div>
					<div className="col-span-2">
						<Label>End date (optional)</Label>
						<Input type="datetime-local" value={endDate} onChange={e => setEndDate(e.target.value)} />
					</div>
				</FocusModal.Body>
				<FocusModal.Footer>
					<Button variant="secondary" onClick={() => onOpenChange(false)}>
						Cancel
					</Button>
					<Button onClick={submit} isLoading={add.isPending}>
						Create
					</Button>
				</FocusModal.Footer>
			</FocusModal.Content>
		</FocusModal>
	)
}
