import { describe, it, expect, vi, beforeEach } from 'vitest'
import { waitFor, act } from '@testing-library/react'
import { renderHookWithClient } from './utils'

vi.mock('../../lib/sdk', () => ({
	sdk: { client: { fetch: vi.fn() } }
}))

import { sdk } from '../../lib/sdk'
import {
	useFormsList,
	useForm,
	useCreateForm,
	useUpdateForm,
	useDeleteForm,
	useDeleteForms,
	useCreateFormField,
	useUpdateFormField,
	useDeleteFormFields,
	useCreateFormFieldOption,
	useUpdateFormFieldOption,
	useDeleteFormFieldOptions,
} from '../forms'

const mockFetch = sdk.client.fetch as ReturnType<typeof vi.fn>

beforeEach(() => { mockFetch.mockReset() })

// ─── Forms ────────────────────────────────────────────────────────────────────

describe('useFormsList', () => {
	it('fetches forms with params', async () => {
		const response = { forms: [{ id: 'form_1', name: 'Contact' }], count: 1, limit: 15, offset: 0 }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useFormsList({ limit: 15, offset: 0 }))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/forms', { query: { limit: 15, offset: 0 } })
	})

	it('is in loading state initially', () => {
		mockFetch.mockResolvedValue({ forms: [], count: 0 })
		const { result } = renderHookWithClient(() => useFormsList({ limit: 15, offset: 0 }))
		expect(result.current.isLoading).toBe(true)
	})
})

describe('useForm', () => {
	it('fetches a single form by id', async () => {
		const response = { form: { id: 'form_1', name: 'Contact', form_fields: [] } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useForm('form_1'))

		await waitFor(() => expect(result.current.isSuccess).toBe(true))
		expect(result.current.data).toEqual(response)
		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1')
	})

	it('does not fetch when id is undefined', () => {
		const { result } = renderHookWithClient(() => useForm(undefined))
		expect(result.current.fetchStatus).toBe('idle')
		expect(mockFetch).not.toHaveBeenCalled()
	})
})

describe('useCreateForm', () => {
	it('posts to /admin/forms and invalidates forms query', async () => {
		const response = { form: { id: 'form_new', name: 'New Form' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useCreateForm())

		await act(async () => {
			await result.current.mutateAsync({ name: 'New Form', handle: 'new-form' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms', {
			method: 'POST',
			body: { name: 'New Form', handle: 'new-form' }
		})
	})
})

describe('useUpdateForm', () => {
	it('posts to /admin/forms/:id and invalidates form and forms queries', async () => {
		const response = { form: { id: 'form_1', name: 'Updated' } }
		mockFetch.mockResolvedValue(response)

		const { result } = renderHookWithClient(() => useUpdateForm('form_1'))

		await act(async () => {
			await result.current.mutateAsync({ name: 'Updated' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1', {
			method: 'POST',
			body: { name: 'Updated' }
		})
	})

	it('can post form_fields for sync', async () => {
		mockFetch.mockResolvedValue({ form: { id: 'form_1' } })

		const { result } = renderHookWithClient(() => useUpdateForm('form_1'))

		await act(async () => {
			await result.current.mutateAsync({
				form_fields: [{ name: 'email', label: 'Email', field_type: 'email' }]
			})
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1', {
			method: 'POST',
			body: { form_fields: [{ name: 'email', label: 'Email', field_type: 'email' }] }
		})
	})
})

describe('useDeleteForm', () => {
	it('sends DELETE to /admin/forms/:id', async () => {
		mockFetch.mockResolvedValue({ deleted: ['form_1'] })

		const { result } = renderHookWithClient(() => useDeleteForm())

		await act(async () => {
			await result.current.mutateAsync('form_1')
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1', { method: 'DELETE' })
	})
})

describe('useDeleteForms', () => {
	it('sends DELETE to /admin/forms with ids array', async () => {
		mockFetch.mockResolvedValue({ deleted: ['form_1', 'form_2'] })

		const { result } = renderHookWithClient(() => useDeleteForms())

		await act(async () => {
			await result.current.mutateAsync(['form_1', 'form_2'])
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms', {
			method: 'DELETE',
			body: { ids: ['form_1', 'form_2'] }
		})
	})
})

// ─── Form Fields ──────────────────────────────────────────────────────────────

describe('useCreateFormField', () => {
	it('posts to /admin/forms/:formId/fields', async () => {
		mockFetch.mockResolvedValue({ field: { id: 'field_1', name: 'email' } })

		const { result } = renderHookWithClient(() => useCreateFormField('form_1'))

		await act(async () => {
			await result.current.mutateAsync({ name: 'email', label: 'Email', field_type: 'email' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1/fields', {
			method: 'POST',
			body: { name: 'email', label: 'Email', field_type: 'email' }
		})
	})
})

describe('useUpdateFormField', () => {
	it('posts to /admin/forms/:formId/fields/:fieldId', async () => {
		mockFetch.mockResolvedValue({ field: { id: 'field_1', label: 'Updated' } })

		const { result } = renderHookWithClient(() => useUpdateFormField('form_1', 'field_1'))

		await act(async () => {
			await result.current.mutateAsync({ label: 'Updated' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1/fields/field_1', {
			method: 'POST',
			body: { label: 'Updated' }
		})
	})

	it('can post field_options for sync', async () => {
		mockFetch.mockResolvedValue({ field: { id: 'field_1' } })

		const { result } = renderHookWithClient(() => useUpdateFormField('form_1', 'field_1'))

		const options = [{ label: 'Red', value: 'red', sort_order: 0 }]
		await act(async () => {
			await result.current.mutateAsync({ field_options: options })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1/fields/field_1', {
			method: 'POST',
			body: { field_options: options }
		})
	})
})

describe('useDeleteFormFields', () => {
	it('sends DELETE to /admin/forms/:formId/fields with ids', async () => {
		mockFetch.mockResolvedValue({ deleted: ['field_1', 'field_2'] })

		const { result } = renderHookWithClient(() => useDeleteFormFields('form_1'))

		await act(async () => {
			await result.current.mutateAsync(['field_1', 'field_2'])
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1/fields', {
			method: 'DELETE',
			body: { ids: ['field_1', 'field_2'] }
		})
	})
})

// ─── Form Field Options ───────────────────────────────────────────────────────

describe('useCreateFormFieldOption', () => {
	it('posts to /admin/forms/:formId/fields/:fieldId/options', async () => {
		mockFetch.mockResolvedValue({ option: { id: 'opt_1', label: 'Red', value: 'red' } })

		const { result } = renderHookWithClient(() => useCreateFormFieldOption('form_1', 'field_1'))

		await act(async () => {
			await result.current.mutateAsync({ label: 'Red', value: 'red', sort_order: 0 })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1/fields/field_1/options', {
			method: 'POST',
			body: { label: 'Red', value: 'red', sort_order: 0 }
		})
	})
})

describe('useUpdateFormFieldOption', () => {
	it('posts to /admin/forms/:formId/fields/:fieldId/options/:optionId', async () => {
		mockFetch.mockResolvedValue({ option: { id: 'opt_1', label: 'Red Updated' } })

		const { result } = renderHookWithClient(
			() => useUpdateFormFieldOption('form_1', 'field_1', 'opt_1')
		)

		await act(async () => {
			await result.current.mutateAsync({ label: 'Red Updated' })
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1/fields/field_1/options/opt_1', {
			method: 'POST',
			body: { label: 'Red Updated' }
		})
	})
})

describe('useDeleteFormFieldOptions', () => {
	it('sends DELETE to /admin/forms/:formId/fields/:fieldId/options with ids', async () => {
		mockFetch.mockResolvedValue({ deleted: ['opt_1', 'opt_2'] })

		const { result } = renderHookWithClient(() => useDeleteFormFieldOptions('form_1', 'field_1'))

		await act(async () => {
			await result.current.mutateAsync(['opt_1', 'opt_2'])
		})

		expect(mockFetch).toHaveBeenCalledWith('/admin/forms/form_1/fields/field_1/options', {
			method: 'DELETE',
			body: { ids: ['opt_1', 'opt_2'] }
		})
	})
})


