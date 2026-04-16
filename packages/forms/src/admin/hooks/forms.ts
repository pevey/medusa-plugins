import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import {
	AdminFormsResponse,
	AdminFormResponse
} from '../types'

// ─── Forms ────────────────────────────────────────────────────────────────────

export const useFormsList = (params: Record<string, unknown>) => {
	return useQuery<AdminFormsResponse>({
		queryFn: () => sdk.client.fetch('/admin/forms', { query: params }),
		queryKey: ['forms', params]
	})
}

export const useForm = (id: string | undefined) => {
	return useQuery<AdminFormResponse>({
		queryFn: () => sdk.client.fetch(`/admin/forms/${id}`),
		queryKey: ['form', id],
		enabled: !!id
	})
}

export const useCreateForm = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<AdminFormResponse>('/admin/forms', { method: 'POST', body: data }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['forms'] })
		}
	})
}

export const useUpdateForm = (id: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch<AdminFormResponse>(`/admin/forms/${id}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['forms'] })
			queryClient.invalidateQueries({ queryKey: ['form', id] })
		}
	})
}

export const useDeleteForm = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (id: string) =>
			sdk.client.fetch(`/admin/forms/${id}`, { method: 'DELETE' }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['forms'] })
		}
	})
}

export const useDeleteForms = () => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch('/admin/forms', { method: 'DELETE', body: { ids } }),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['forms'] })
		}
	})
}

// ─── Form Fields ──────────────────────────────────────────────────────────────

export const useCreateFormField = (formId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/forms/${formId}/fields`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['form', formId] })
		}
	})
}

export const useUpdateFormField = (formId: string, fieldId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/forms/${formId}/fields/${fieldId}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['form', formId] })
		}
	})
}

export const useDeleteFormFields = (formId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch(`/admin/forms/${formId}/fields`, {
				method: 'DELETE',
				body: { ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['form', formId] })
		}
	})
}

// ─── Form Field Options ───────────────────────────────────────────────────────

export const useCreateFormFieldOption = (formId: string, fieldId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/forms/${formId}/fields/${fieldId}/options`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['form', formId] })
		}
	})
}

export const useUpdateFormFieldOption = (formId: string, fieldId: string, optionId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (data: object) =>
			sdk.client.fetch(`/admin/forms/${formId}/fields/${fieldId}/options/${optionId}`, {
				method: 'POST',
				body: data
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['form', formId] })
		}
	})
}

export const useDeleteFormFieldOptions = (formId: string, fieldId: string) => {
	const queryClient = useQueryClient()
	return useMutation({
		mutationFn: (ids: string[]) =>
			sdk.client.fetch(`/admin/forms/${formId}/fields/${fieldId}/options`, {
				method: 'DELETE',
				body: { ids }
			}),
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ['form', formId] })
		}
	})
}


