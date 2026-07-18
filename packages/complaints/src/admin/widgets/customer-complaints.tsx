import { Container, Heading, Text, Button, Badge } from '@medusajs/ui'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminCustomer } from '@medusajs/framework/types'
import { useQuery } from '@tanstack/react-query'
import { Outlet, useNavigate } from 'react-router-dom'
import { sdk } from '../lib/sdk'
import { AdminComplaintsResponse } from '../types'

export const config = defineWidgetConfig({
	zone: 'customer.details.side.before'
})

const CustomerComplaintsWidget = ({ data: customer }: DetailWidgetProps<AdminCustomer>) => {
	const navigate = useNavigate()

	// Optional integration with medusa-plugin-access. This endpoint only exists
	// when the access plugin is installed; if it isn't, the request 404s and we
	// treat that as "no access control" (render for everyone). When it IS
	// installed, we gate this widget on the `complaint:read` permission.
	const { data: access, isLoading: accessLoading } = useQuery({
		queryFn: async (): Promise<{ permissions: string[] } | null> => {
			try {
				return await sdk.client.fetch<{ permissions: string[] }>(
					'/admin/access/me/permissions'
				)
			} catch {
				return null
			}
		},
		queryKey: ['access', 'me', 'permissions'],
		retry: false,
		staleTime: 5 * 60 * 1000
	})

	// access === null → plugin not installed → don't gate.
	// access present  → require complaint:read.
	const accessInstalled = !!access
	const canReadComplaints =
		!accessInstalled || !!access?.permissions?.includes('complaint:read')

	const { data, isLoading } = useQuery<AdminComplaintsResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/complaints`, {
				query: {
					customer_id: customer.id,
					fields: 'id,number,status,description',
					limit: 10
				}
			}),
		queryKey: ['complaints', 'customer', customer.id],
		// Wait for the access check, and skip the (guarded) request entirely when
		// the user lacks permission — avoids firing a doomed 403.
		enabled: !accessLoading && canReadComplaints
	})

	// Still resolving the permission check → render nothing yet.
	if (accessLoading) {
		return null
	}

	// Access plugin installed and the user can't read complaints → hide widget.
	if (accessInstalled && !canReadComplaints) {
		return null
	}

	const complaints = data?.complaints ?? []

	const truncate = (text: string, maxLength = 100) =>
		text.length > maxLength ? `${text.slice(0, maxLength)}...` : text

	return (
		<>
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Complaints</Heading>
					<Button
						size="small"
						variant="secondary"
						onClick={() => navigate(`/complaints/create?customer_id=${customer.id}`)}
					>
						Create Complaint
					</Button>
				</div>

				{isLoading ? (
					<div className="px-6 py-4">
						<Text size="small">Loading...</Text>
					</div>
				) : complaints.length > 0 ? (
					complaints.map(complaint => (
						<div
							key={complaint.id}
							className="flex items-start justify-between gap-4 px-6 py-4 cursor-pointer hover:bg-ui-bg-subtle"
							onClick={() => navigate(`/complaints/${complaint.id}`)}
						>
							<div className="flex flex-col gap-1">
								<Text size="small" weight="plus">
									#{complaint.number}
								</Text>
								<Text size="small" className="text-ui-fg-subtle">
									{truncate(complaint.description)}
								</Text>
							</div>
							<Badge size="xsmall" color={complaint.status === 'open' ? 'orange' : 'grey'}>
								{complaint.status}
							</Badge>
						</div>
					))
				) : (
					<div className="px-6 py-4">
						<Text size="small" className="text-ui-fg-subtle">
							No complaints for this order.
						</Text>
					</div>
				)}
			</Container>
			<Outlet />
		</>
	)
}

export default CustomerComplaintsWidget
