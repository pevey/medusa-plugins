import { Container, Heading, Text } from '@medusajs/ui'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { sdk } from '../../../../lib/sdk'
import { useAccessPolicy, useAccessPolicyRoles } from '../../../../hooks/policies'

type PolicyLoaderData = { policy: { id: string; key: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<PolicyLoaderData>(`/admin/access/policies/${id}`, {
		query: { fields: 'id,key' }
	})
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<PolicyLoaderData>) =>
		data?.policy?.key || data?.policy?.id || 'Policy'
}

const Row = ({ label, value }: { label: string; value?: string | null }) => (
	<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
		<Text size="small" weight="plus" leading="compact">
			{label}
		</Text>
		<Text size="small" leading="compact">
			{value || '-'}
		</Text>
	</div>
)

const PolicyDetailPage = () => {
	const { id } = useParams()
	const navigate = useNavigate()
	const { data, isLoading } = useAccessPolicy(id)
	const { data: rolesData } = useAccessPolicyRoles(id)

	const policy = data?.policy
	const roles = rolesData?.roles ?? []

	if (isLoading) {
		return (
			<Container className="p-6">
				<Text>Loading...</Text>
			</Container>
		)
	}
	if (!policy) {
		return (
			<Container className="p-6">
				<Text>Policy not found.</Text>
			</Container>
		)
	}

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">{policy.key}</Heading>
				</div>
				<Row label="Resource" value={policy.resource} />
				<Row label="Operation" value={policy.operation} />
				<Row label="Name" value={policy.name} />
				<Row label="Description" value={policy.description} />
			</Container>

			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Roles using this policy</Heading>
				</div>
				{roles.length ? (
					roles.map(r => (
						<div
							key={r.id}
							className="flex cursor-pointer items-center justify-between px-6 py-4 hover:bg-ui-bg-subtle"
							onClick={() => navigate(`/settings/access-roles/${r.id}`)}
						>
							<div className="flex flex-col">
								<Text size="small" weight="plus" leading="compact">
									{r.name}
								</Text>
								{r.description ? (
									<Text size="small" className="text-ui-fg-subtle" leading="compact">
										{r.description}
									</Text>
								) : null}
							</div>
							{typeof r.users?.length === 'number' ? (
								<Text size="small" className="text-ui-fg-subtle">
									{r.users.length} user(s)
								</Text>
							) : null}
						</div>
					))
				) : (
					<div className="px-6 py-4">
						<Text size="small" className="text-ui-fg-subtle">
							No roles reference this policy.
						</Text>
					</div>
				)}
			</Container>
		</div>
	)
}

export default PolicyDetailPage
