import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import {
	AdminAccessRoleResponse,
	AdminAccessRolesResponse,
	AdminAccessRolePoliciesResponse,
	AdminAccessRoleUsersResponse,
	AdminAddRolePoliciesResponse,
	AdminAssignRoleUsersResponse
} from '../types'

// --- Roles CRUD ---------------------------------------------------------------

export const useAccessRolesList = (params: { limit: number; offset: number; q?: string; order?: string }) => {
	return useQuery<AdminAccessRolesResponse>({
		queryFn: () => sdk.client.fetch('/admin/access/roles', { query: params }),
		queryKey: ['access-roles', params]
	})
}

export const useAccessRole = (id: string | undefined) => {
	return useQuery<AdminAccessRoleResponse>({
		queryFn: () => sdk.client.fetch(`/admin/access/roles/${id}`),
		queryKey: ['access-role', id],
		enabled: !!id
	})
}

export const useCreateAccessRole = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { name: string; description?: string; parent_ids?: string[]; policy_ids?: string[] }) =>
			sdk.client.fetch<AdminAccessRoleResponse>('/admin/access/roles', {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['access-roles'] })
		}
	})
}

export const useUpdateAccessRole = (id: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: { name?: string; description?: string }) =>
			sdk.client.fetch<AdminAccessRoleResponse>(`/admin/access/roles/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['access-role', id] })
			queryClient.invalidateQueries({ queryKey: ['access-roles'] })
		}
	})
}

export const useDeleteAccessRoles = () => {
	const queryClient = useQueryClient()
	return useMutation({
		// DELETE is per-id; loop to support single + bulk from the list.
		mutationFn: (ids: string[]) => Promise.all(ids.map(id => sdk.client.fetch(`/admin/access/roles/${id}`, { method: 'DELETE' }))),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['access-roles'] })
		}
	})
}

// --- Role ↔ Policy assignment -------------------------------------------------

export const useAccessRolePolicies = (roleId: string | undefined) => {
	return useQuery<AdminAccessRolePoliciesResponse>({
		queryFn: () =>
			sdk.client.fetch(`/admin/access/roles/${roleId}/policies`, {
				// `policy.key`, not bare `policy` -- see the note in
				// `roles/[id]/policies/route.ts` on why the bare relation name
				// returns a nested `{ id }` object instead of the key string.
				query: { fields: 'id,role_id,policy_id,policy.key', limit: 200 }
			}),
		queryKey: ['access-role-policies', roleId],
		enabled: !!roleId
	})
}

export const useAddAccessRolePolicies = (roleId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (policies: string[]) =>
			sdk.client.fetch<AdminAddRolePoliciesResponse>(`/admin/access/roles/${roleId}/policies`, {
				method: 'POST',
				body: { policies }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['access-role-policies', roleId] })
		}
	})
}

export const useRemoveAccessRolePolicy = (roleId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (policyId: string) =>
			sdk.client.fetch(`/admin/access/roles/${roleId}/policies/${policyId}`, {
				method: 'DELETE'
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['access-role-policies', roleId] })
		}
	})
}

// --- Role ↔ User assignment ---------------------------------------------------

export const useAccessRoleUsers = (roleId: string | undefined) => {
	return useQuery<AdminAccessRoleUsersResponse>({
		queryFn: () => sdk.client.fetch(`/admin/access/roles/${roleId}/users`, { query: { limit: 200 } }),
		queryKey: ['access-role-users', roleId],
		enabled: !!roleId
	})
}

export const useAssignAccessRoleUsers = (roleId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (users: string[]) =>
			sdk.client.fetch<AdminAssignRoleUsersResponse>(`/admin/access/roles/${roleId}/users`, {
				method: 'POST',
				body: { users }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['access-role-users', roleId] })
		}
	})
}

export const useRemoveAccessRoleUsers = (roleId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (users: string[]) =>
			sdk.client.fetch(`/admin/access/roles/${roleId}/users`, {
				method: 'DELETE',
				body: { users }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['access-role-users', roleId] })
		}
	})
}
