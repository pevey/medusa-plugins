import { useEffect, useState } from 'react'
import { Button, Drawer, Heading, Input, Label, Text, toast } from '@medusajs/ui'
import { AdminAffiliatePromotion } from '../types'
import { useUpdateAffiliatePromotion } from '../hooks/affiliates'

type Props = {
	affiliateId: string
	promotion: AdminAffiliatePromotion | null
	open: boolean
	onOpenChange: (open: boolean) => void
}

export const EditPromotionCodeDrawer = ({ affiliateId, promotion, open, onOpenChange }: Props) => {
	const update = useUpdateAffiliatePromotion(affiliateId, promotion?.id ?? '')
	const [code, setCode] = useState(promotion?.code ?? '')
	const [value, setValue] = useState<string>(String(promotion?.application_method?.value ?? ''))
	const [endDate, setEndDate] = useState(promotion?.campaign?.ends_at?.slice(0, 16) ?? '')

	useEffect(() => {
		if (open && promotion) {
			setCode(promotion.code)
			setValue(String(promotion.application_method?.value ?? ''))
			setEndDate(promotion.campaign?.ends_at?.slice(0, 16) ?? '')
		}
	}, [open, promotion])

	if (!promotion) return null

	const submit = async (e: React.FormEvent) => {
		e.preventDefault()
		try {
			await update.mutateAsync({
				code,
				discount_value: value ? Number(value) : undefined,
				end_date: endDate ? new Date(endDate).toISOString() : null
			})
			toast.success('Promotion code updated.')
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
						<Heading level="h1">Edit promotion code</Heading>
					</Drawer.Header>
					<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Code
							</Label>
							<Input value={code} onChange={e => setCode(e.target.value)} />
						</div>
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								Discount value
							</Label>
							<Input type="number" value={value} onChange={e => setValue(e.target.value)} />
						</div>
						<div className="flex flex-col space-y-2">
							<Label size="small" weight="plus">
								End date
							</Label>
							<Input
								type="datetime-local"
								value={endDate}
								onChange={e => setEndDate(e.target.value)}
							/>
						</div>
						<Text size="xsmall" className="text-ui-fg-subtle">
							Discount type cannot be changed after creation.
						</Text>
					</Drawer.Body>
					<Drawer.Footer>
						<div className="flex items-center justify-end gap-x-2">
							<Drawer.Close asChild>
								<Button size="small" variant="secondary">
									Cancel
								</Button>
							</Drawer.Close>
							<Button
								size="small"
								type="submit"
								disabled={update.isPending}
								isLoading={update.isPending}
							>
								Save
							</Button>
						</div>
					</Drawer.Footer>
				</form>
			</Drawer.Content>
		</Drawer>
	)
}
