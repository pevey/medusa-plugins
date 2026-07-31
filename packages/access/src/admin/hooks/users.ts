import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { AdminUsersResponse, AdminAccessRolesResponse, AdminAssignUserRolesResponse } from '../types'

// Core users list — used by the "add users to role" picker.
export const useUsersList = (params: { limit: number; offset: number; q?: string }) => {
	return useQuery<AdminUsersResponse>({
		queryFn: () =>
			sdk.client.fetch('/admin/users', {
				query: { ...params, fields: 'id,email,first_name,last_name' }
			}),
		queryKey: ['users', params]
	})
}

// A single user's assigned access roles — used by the user.details widget.
export const useUserAccessRoles = (userId: string | undefined) => {
	return useQuery<AdminAccessRolesResponse>({
		queryFn: () => sdk.client.fetch(`/admin/users/${userId}/access/roles`, { query: { limit: 200 } }),
		queryKey: ['user-access-roles', userId],
		enabled: !!userId
	})
}

export const useAssignUserRoles = (userId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (roles: string[]) =>
			sdk.client.fetch<AdminAssignUserRolesResponse>(`/admin/users/${userId}/access/roles`, {
				method: 'POST',
				body: { roles }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user-access-roles', userId] })
		}
	})
}

export const useRemoveUserRole = (userId: string | undefined) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (roleId: string) => sdk.client.fetch(`/admin/users/${userId}/access/roles/${roleId}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['user-access-roles', userId] })
		}
	})
}
