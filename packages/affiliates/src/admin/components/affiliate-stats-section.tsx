import { useState } from 'react'
import { Button, Container, Heading, Select, Table, toast } from '@medusajs/ui'
import { AdminAffiliate, AdminAffiliateStatsBucket } from '../types'
import { useAffiliateStats, useRecalculateAffiliateAttributions } from '../hooks/affiliates'

type Basis = 'placed' | 'captured' | 'completed'
type Window = 'day' | 'week' | 'month' | 'year' | 'all'

export const AffiliateStatsSection = ({ affiliate }: { affiliate: AdminAffiliate }) => {
	const [basis, setBasis] = useState<Basis>('completed')
	const [window, setWindow] = useState<Window>('month')
	const [promotionId, setPromotionId] = useState<string>('all')

	const stats = useAffiliateStats(affiliate.id, {
		basis,
		window,
		promotion_id: promotionId === 'all' ? undefined : promotionId
	})
	const recalc = useRecalculateAffiliateAttributions(affiliate.id)

	const onRecalc = async () => {
		try {
			await recalc.mutateAsync()
			toast.success('Resync started.')
		} catch (err: any) {
			toast.error(err?.message ?? 'Resync failed.')
		}
	}

	const buckets = stats.data?.buckets ?? []
	const primaryCurrency = stats.data?.primary_currency_code ?? null
	const primaryBucket =
		buckets.find(b => b.currency_code === primaryCurrency) ?? buckets[0] ?? null
	const otherBuckets = buckets.filter(b => b !== primaryBucket)

	const renderTable = (rows: AdminAffiliateStatsBucket[]) => (
		<Table>
			<Table.Header>
				<Table.Row>
					<Table.HeaderCell>Currency</Table.HeaderCell>
					<Table.HeaderCell>Orders</Table.HeaderCell>
					<Table.HeaderCell>Gross total</Table.HeaderCell>
					<Table.HeaderCell>Net total</Table.HeaderCell>
					<Table.HeaderCell>Avg gross</Table.HeaderCell>
					<Table.HeaderCell>Avg net</Table.HeaderCell>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{rows.map(b => (
					<Table.Row key={b.currency_code}>
						<Table.Cell>{b.currency_code.toUpperCase()}</Table.Cell>
						<Table.Cell>{b.order_count}</Table.Cell>
						<Table.Cell>{b.gross_total.toFixed(2)}</Table.Cell>
						<Table.Cell>{b.net_total.toFixed(2)}</Table.Cell>
						<Table.Cell>{b.average_order_value_gross.toFixed(2)}</Table.Cell>
						<Table.Cell>{b.average_order_value_net.toFixed(2)}</Table.Cell>
					</Table.Row>
				))}
			</Table.Body>
		</Table>
	)

	return (
		<Container className="p-6">
			<div className="flex items-center justify-between mb-4">
				<Heading level="h2">Promotion usage</Heading>
				<div className="flex items-center gap-2">
					<Select value={window} onValueChange={v => setWindow(v as Window)}>
						<Select.Trigger className="w-28">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="day">Day</Select.Item>
							<Select.Item value="week">Week</Select.Item>
							<Select.Item value="month">Month</Select.Item>
							<Select.Item value="year">Year</Select.Item>
							<Select.Item value="all">All</Select.Item>
						</Select.Content>
					</Select>
					<Select value={basis} onValueChange={v => setBasis(v as Basis)}>
						<Select.Trigger className="w-32">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="placed">Placed</Select.Item>
							<Select.Item value="captured">Captured</Select.Item>
							<Select.Item value="completed">Completed</Select.Item>
						</Select.Content>
					</Select>
					<Select value={promotionId} onValueChange={setPromotionId}>
						<Select.Trigger className="w-40">
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="all">All codes</Select.Item>
							{(affiliate.promotions ?? []).map(p => (
								<Select.Item key={p.id} value={p.id}>
									{p.code}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
				</div>
			</div>

			{primaryBucket ? (
				renderTable([primaryBucket])
			) : (
				<div className="text-ui-fg-subtle">No data in primary currency.</div>
			)}

			{otherBuckets.length > 0 && (
				<div className="mt-6">
					<Heading level="h3">Other currencies</Heading>
					{renderTable(otherBuckets)}
				</div>
			)}

			<div className="mt-4 flex items-center justify-between text-ui-fg-subtle text-xs">
				<span>Order attribution synced daily.</span>
				<Button
					variant="secondary"
					size="small"
					onClick={onRecalc}
					isLoading={recalc.isPending}
				>
					Resync now
				</Button>
			</div>
		</Container>
	)
}
