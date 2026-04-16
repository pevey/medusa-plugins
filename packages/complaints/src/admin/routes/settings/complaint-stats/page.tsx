import { Container, Heading, Button, toast } from '@medusajs/ui'
import { defineRouteConfig } from '@medusajs/admin-sdk'
import { useRecalculateComplaintStats } from '../../../hooks/complaints'

export const config = defineRouteConfig({ label: 'Recalculate Complaint Stats', rank: 20 })
export const handle = { breadcrumb: () => 'Recalculate Complaint Stats' }

const ComplaintStatsPage = () => {
	const { mutate, isPending } = useRecalculateComplaintStats()

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Complaint Statistics</Heading>
			</div>
			<div className="px-6 py-8">
				<Button variant="primary" onClick={() => mutate(undefined, { onSuccess: () => toast.success('Complaint stats updated successfully'), onError: () => toast.error('Failed to update complaint stats') })} isLoading={isPending}>
					Recalculate Complaint Stats
				</Button>
			</div>
		</Container>
	)
}

export default ComplaintStatsPage
