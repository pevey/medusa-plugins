import { useQuery } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminAccessPoliciesResponse, AdminAccessPolicyResponse, AdminAccessPolicyRolesResponse } from '../types'

// Policies are read-only in the UI (they are defined in code and synced to the
// DB on startup). We only list, view, and show which roles reference them.

export const useAccessPoliciesList = (params: { limit: number; offset: number; q?: string }) => {
	return useQuery<AdminAccessPoliciesResponse>({
		queryFn: () => sdk.client.fetch('/admin/access/policies', { query: params }),
		queryKey: ['access-policies', params]
	})
}

export const useAccessPolicy = (id: string | undefined) => {
	return useQuery<AdminAccessPolicyResponse>({
		queryFn: () => sdk.client.fetch(`/admin/access/policies/${id}`),
		queryKey: ['access-policy', id],
		enabled: !!id
	})
}

export const useAccessPolicyRoles = (policyId: string | undefined) => {
	return useQuery<AdminAccessPolicyRolesResponse>({
		queryFn: () => sdk.client.fetch(`/admin/access/policies/${policyId}/roles`, { query: { limit: 200 } }),
		queryKey: ['access-policy-roles', policyId],
		enabled: !!policyId
	})
}
