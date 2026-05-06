/**
 * Integration tests for the form module.
 *
 * Covers:
 *  - Authentication enforcement on all admin endpoints
 *  - Request body validation (missing required fields, empty arrays, invalid handles)
 *  - Full CRUD for forms (create, read, update, delete — single and bulk)
 *  - Create form with inline fields
 *  - Update form with form_fields sync (add, update, remove in one request)
 *  - Form fields sub-resource CRUD
 *  - Field options sub-resource CRUD
 *  - Update field with field_options sync (add, update, remove in one request)
 *  - Form submissions (list, get, update status, delete single and bulk)
 *  - Store endpoint: POST /forms/:handle (404, inactive, missing required, success)
 *
 * Notes:
 *  - All test forms use turnstile_enabled: false to avoid mocking Cloudflare.
 *  - The handle regex requires lowercase letters, numbers, and hyphens only.
 *
 * Run with:
 *   npm run test:integration:http -- --testPathPattern=forms
 */

import { medusaIntegrationTestRunner } from '@medusajs/test-utils'
import { Modules } from '@medusajs/framework/utils'
import { createUserAccountWorkflow } from '@medusajs/medusa/core-flows'

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
	dbName: 'medusa_test',
	inApp: true,
	disableAutoTeardown: true,
	env: { TURNSTILE_SECRET_KEY: '1x0000000000000000000000000000000AA' },
	testSuite: ({ api, getContainer }) => {
		let adminToken: string

		const auth = () => ({ headers: { Authorization: `Bearer ${adminToken}` } })

		// ── Setup ────────────────────────────────────────────────────────────────

		beforeAll(async () => {
			const container = getContainer()
			const authService = container.resolve(Modules.AUTH)

			const { authIdentity } = await authService.register('emailpass', {
				body: { email: 'forms-test@example.com', password: 'Sup3rSecret!' }
			})

			await createUserAccountWorkflow(container).run({
				input: {
					authIdentityId: authIdentity!.id,
					userData: {
						email: 'forms-test@example.com',
						first_name: 'Forms',
						last_name: 'Tester'
					}
				}
			})

			const loginRes = await api.post('/auth/user/emailpass', {
				email: 'forms-test@example.com',
				password: 'Sup3rSecret!'
			})
			adminToken = loginRes.data.token
		})

		// ── Authentication ────────────────────────────────────────────────────────

		describe('Authentication', () => {
			const F = 'fake_id'
			const endpoints = [
				['GET',    '/admin/forms',                                  null],
				['POST',   '/admin/forms',                                  { name: 'x', handle: 'x' }],
				['DELETE', '/admin/forms',                                  { ids: [F] }],
				['GET',    `/admin/forms/${F}`,                             null],
				['POST',   `/admin/forms/${F}`,                             { name: 'y' }],
				['DELETE', `/admin/forms/${F}`,                             null],
				['GET',    `/admin/forms/${F}/fields`,                      null],
				['POST',   `/admin/forms/${F}/fields`,                      { name: 'n', label: 'L', field_type: 'text' }],
				['DELETE', `/admin/forms/${F}/fields`,                      { ids: [F] }],
				['POST',   `/admin/forms/${F}/fields/${F}`,                 { label: 'L2' }],
				['DELETE', `/admin/forms/${F}/fields/${F}`,                 null],
				['POST',   `/admin/forms/${F}/fields/${F}/options`,         { label: 'Opt', value: 'opt' }],
				['DELETE', `/admin/forms/${F}/fields/${F}/options`,         { ids: [F] }],
				['POST',   `/admin/forms/${F}/fields/${F}/options/${F}`,    { label: 'Opt2' }],
				['DELETE', `/admin/forms/${F}/fields/${F}/options/${F}`,    null],
				['GET',    '/admin/form-submissions',                        null],
				['DELETE', '/admin/form-submissions',                        { ids: [F] }],
				['GET',    `/admin/form-submissions/${F}`,                  null],
				['POST',   `/admin/form-submissions/${F}`,                  { status: 'read' }],
				['DELETE', `/admin/form-submissions/${F}`,                  null],
			] as const

			it.each(endpoints)('%s %s returns 401 without auth token', async (method, path, body) => {
				let res: any
				if (method === 'GET') {
					res = await api.get(path).catch((e: any) => e.response)
				} else if (method === 'DELETE') {
					res = await api.delete(path, { data: body }).catch((e: any) => e.response)
				} else {
					res = await api.post(path, body).catch((e: any) => e.response)
				}
				expect(res.status).toBe(401)
			})
		})

		// ── Validation ────────────────────────────────────────────────────────────

		describe('Validation', () => {
			it('POST /admin/forms rejects missing name', async () => {
				const res = await api
					.post('/admin/forms', { handle: 'test-handle' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/forms rejects missing handle', async () => {
				const res = await api
					.post('/admin/forms', { name: 'Test' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/forms rejects invalid handle characters', async () => {
				const res = await api
					.post('/admin/forms', { name: 'Test', handle: 'UPPERCASE' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/forms rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/forms', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/forms/:id/fields rejects missing name', async () => {
				const res = await api
					.post('/admin/forms/fake/fields', { label: 'L', field_type: 'text' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/forms/:id/fields rejects missing label', async () => {
				const res = await api
					.post('/admin/forms/fake/fields', { name: 'n', field_type: 'text' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/forms/:id/fields rejects missing field_type', async () => {
				const res = await api
					.post('/admin/forms/fake/fields', { name: 'n', label: 'L' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('DELETE /admin/form-submissions rejects empty ids array', async () => {
				const res = await api
					.delete('/admin/form-submissions', { data: { ids: [] }, ...auth() })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('POST /admin/form-submissions/:id rejects invalid status', async () => {
				const res = await api
					.post('/admin/form-submissions/fake', { status: 'invalid' }, auth())
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})
		})

		// ── Forms ─────────────────────────────────────────────────────────────────

		describe('Forms', () => {
			let formId: string
			let formId2: string
			const ts = Date.now()

			beforeAll(async () => {
				const [r1, r2] = await Promise.all([
					api.post('/admin/forms', {
						name: `Contact Us ${ts}`,
						handle: `contact-us-${ts}`,
						description: 'Main contact form',
						active: true,
						turnstile_enabled: false
					}, auth()),
					api.post('/admin/forms', {
						name: `Newsletter ${ts}`,
						handle: `newsletter-${ts}`,
						turnstile_enabled: false
					}, auth())
				])
				formId = r1.data.form.id
				formId2 = r2.data.form.id
			})

			afterAll(async () => {
				await api
					.delete('/admin/forms', { data: { ids: [formId, formId2] }, ...auth() })
					.catch(() => {})
			})

			it('POST /admin/forms creates a form', async () => {
				const res = await api.get(`/admin/forms/${formId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.form).toMatchObject({
					id: formId,
					handle: `contact-us-${ts}`,
					active: true,
					turnstile_enabled: false
				})
			})

			it('GET /admin/forms lists forms', async () => {
				const res = await api.get('/admin/forms', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.forms)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
				expect(res.data.limit).toBeGreaterThan(0)
				expect(res.data.offset).toBe(0)
			})

			it('GET /admin/forms filters by q', async () => {
				const res = await api.get(`/admin/forms?q=contact-us-${ts}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.forms.length).toBeGreaterThanOrEqual(1)
				expect(res.data.forms.some((f: any) => f.handle === `contact-us-${ts}`)).toBe(true)
			})

			it('GET /admin/forms/:id retrieves a form with defaults', async () => {
				const res = await api.get(`/admin/forms/${formId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.form).toMatchObject({
					id: formId,
					handle: `contact-us-${ts}`,
					description: 'Main contact form',
					active: true,
					turnstile_enabled: false
				})
				expect(Array.isArray(res.data.form.form_fields)).toBe(true)
			})

			it('POST /admin/forms/:id updates a form', async () => {
				const res = await api.post(
					`/admin/forms/${formId2}`,
					{ name: `Newsletter Updated ${ts}` },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.form.name).toBe(`Newsletter Updated ${ts}`)
			})

			it('DELETE /admin/forms/:id deletes a single form', async () => {
				const created = await api.post('/admin/forms', {
					name: 'To Delete',
					handle: `to-delete-${ts}`,
					turnstile_enabled: false
				}, auth())
				const id = created.data.form.id

				const res = await api.delete(`/admin/forms/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/forms bulk deletes forms', async () => {
				const ts2 = `${ts}-bulk`
				const [a, b] = await Promise.all([
					api.post('/admin/forms', { name: 'Bulk A', handle: `bulk-a-${ts}`, turnstile_enabled: false }, auth()),
					api.post('/admin/forms', { name: 'Bulk B', handle: `bulk-b-${ts}`, turnstile_enabled: false }, auth())
				])
				const ids = [a.data.form.id, b.data.form.id]

				const res = await api.delete('/admin/forms', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})

			it('POST /admin/forms creates a form with inline fields', async () => {
				const ts3 = `${ts}-with-fields`
				const res = await api.post('/admin/forms', {
					name: 'Form With Fields',
					handle: `with-fields-${ts}`,
					turnstile_enabled: false,
					form_fields: [
						{ name: 'first_name', label: 'First Name', field_type: 'text', required: true, sort_order: 0 },
						{ name: 'email', label: 'Email', field_type: 'email', required: true, sort_order: 1 }
					]
				}, auth())
				expect(res.status).toBe(200)
				const fId = res.data.form.id

				const detail = await api.get(`/admin/forms/${fId}`, auth())
				expect(detail.data.form.form_fields).toHaveLength(2)
				expect(detail.data.form.form_fields.map((f: any) => f.name)).toEqual(
					expect.arrayContaining(['first_name', 'email'])
				)

				await api.delete(`/admin/forms/${fId}`, auth()).catch(() => {})
			})

			it('POST /admin/forms/:id syncs form_fields (add, update, remove)', async () => {
				const syncTs = Date.now()
				const created = await api.post('/admin/forms', {
					name: 'Sync Test',
					handle: `sync-test-${syncTs}`,
					turnstile_enabled: false,
					form_fields: [
						{ name: 'keep_me', label: 'Keep Me', field_type: 'text', sort_order: 0 },
						{ name: 'remove_me', label: 'Remove Me', field_type: 'text', sort_order: 1 }
					]
				}, auth())
				const syncFormId = created.data.form.id

				const detail = await api.get(`/admin/forms/${syncFormId}`, auth())
				const keepId = detail.data.form.form_fields.find((f: any) => f.name === 'keep_me').id

				// Sync: keep and rename one, remove the other, add a new one
				const syncRes = await api.post(`/admin/forms/${syncFormId}`, {
					form_fields: [
						{ id: keepId, name: 'keep_me', label: 'Kept & Renamed', field_type: 'text', sort_order: 0 },
						{ name: 'new_field', label: 'New Field', field_type: 'email', sort_order: 1 }
					]
				}, auth())
				expect(syncRes.status).toBe(200)

				const after = await api.get(`/admin/forms/${syncFormId}`, auth())
				const afterFields = after.data.form.form_fields
				expect(afterFields).toHaveLength(2)
				expect(afterFields.find((f: any) => f.id === keepId)?.label).toBe('Kept & Renamed')
				expect(afterFields.find((f: any) => f.name === 'new_field')).toBeDefined()
				expect(afterFields.find((f: any) => f.name === 'remove_me')).toBeUndefined()

				await api.delete(`/admin/forms/${syncFormId}`, auth()).catch(() => {})
			})
		})

		// ── Fields Sub-Resource ────────────────────────────────────────────────────

		describe('Fields', () => {
			let formId: string
			let fieldId: string
			const ts = Date.now()

			beforeAll(async () => {
				const formRes = await api.post('/admin/forms', {
					name: `Fields Test ${ts}`,
					handle: `fields-test-${ts}`,
					turnstile_enabled: false
				}, auth())
				formId = formRes.data.form.id

				const fieldRes = await api.post(`/admin/forms/${formId}/fields`, {
					name: 'message',
					label: 'Message',
					field_type: 'textarea',
					required: true,
					sort_order: 0
				}, auth())
				fieldId = fieldRes.data.field.id
			})

			afterAll(async () => {
				await api.delete(`/admin/forms/${formId}`, auth()).catch(() => {})
			})

			it('POST /admin/forms/:id/fields creates a field', async () => {
				expect(fieldId).toBeDefined()
			})

			it('GET /admin/forms/:id/fields lists fields for a form', async () => {
				const res = await api.get(`/admin/forms/${formId}/fields`, auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.fields)).toBe(true)
				expect(res.data.fields.length).toBeGreaterThanOrEqual(1)
			})

			it('POST /admin/forms/:id/fields/:fieldId updates a field', async () => {
				const res = await api.post(
					`/admin/forms/${formId}/fields/${fieldId}`,
					{ label: 'Your Message', required: false },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.field.label).toBe('Your Message')
				expect(res.data.field.required).toBe(false)
			})

			it('DELETE /admin/forms/:id/fields/:fieldId deletes a field', async () => {
				const created = await api.post(`/admin/forms/${formId}/fields`, {
					name: 'temp_field',
					label: 'Temp',
					field_type: 'text',
					sort_order: 99
				}, auth())
				const id = created.data.field.id

				const res = await api.delete(`/admin/forms/${formId}/fields/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/forms/:id/fields bulk deletes fields', async () => {
				const [a, b] = await Promise.all([
					api.post(`/admin/forms/${formId}/fields`, { name: 'f_a', label: 'A', field_type: 'text', sort_order: 10 }, auth()),
					api.post(`/admin/forms/${formId}/fields`, { name: 'f_b', label: 'B', field_type: 'text', sort_order: 11 }, auth())
				])
				const ids = [a.data.field.id, b.data.field.id]

				const res = await api.delete(`/admin/forms/${formId}/fields`, { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})

			it('POST /admin/forms/:id/fields/:fieldId syncs field_options (add, update, remove)', async () => {
				const selectRes = await api.post(`/admin/forms/${formId}/fields`, {
					name: 'color',
					label: 'Color',
					field_type: 'select',
					sort_order: 5
				}, auth())
				const selectFieldId = selectRes.data.field.id

				// Add two options
				const syncRes = await api.post(`/admin/forms/${formId}/fields/${selectFieldId}`, {
					field_options: [
						{ label: 'Red', value: 'red', sort_order: 0 },
						{ label: 'Blue', value: 'blue', sort_order: 1 }
					]
				}, auth())
				expect(syncRes.status).toBe(200)

				const after = await api.get(`/admin/forms/${formId}`, auth())
				const colorField = after.data.form.form_fields.find((f: any) => f.id === selectFieldId)
				expect(colorField.field_options).toHaveLength(2)

				const redId = colorField.field_options.find((o: any) => o.value === 'red').id

				// Update red, remove blue, add green
				const syncRes2 = await api.post(`/admin/forms/${formId}/fields/${selectFieldId}`, {
					field_options: [
						{ id: redId, label: 'Red Updated', value: 'red', sort_order: 0 },
						{ label: 'Green', value: 'green', sort_order: 1 }
					]
				}, auth())
				expect(syncRes2.status).toBe(200)

				const after2 = await api.get(`/admin/forms/${formId}`, auth())
				const updatedField = after2.data.form.form_fields.find((f: any) => f.id === selectFieldId)
				expect(updatedField.field_options).toHaveLength(2)
				expect(updatedField.field_options.find((o: any) => o.id === redId)?.label).toBe('Red Updated')
				expect(updatedField.field_options.find((o: any) => o.value === 'green')).toBeDefined()
				expect(updatedField.field_options.find((o: any) => o.value === 'blue')).toBeUndefined()

				await api.delete(`/admin/forms/${formId}/fields/${selectFieldId}`, auth()).catch(() => {})
			})
		})

		// ── Field Options Sub-Resource ─────────────────────────────────────────────

		describe('Field Options', () => {
			let formId: string
			let fieldId: string
			let optionId: string
			const ts = Date.now()

			beforeAll(async () => {
				const formRes = await api.post('/admin/forms', {
					name: `Options Test ${ts}`,
					handle: `options-test-${ts}`,
					turnstile_enabled: false
				}, auth())
				formId = formRes.data.form.id

				const fieldRes = await api.post(`/admin/forms/${formId}/fields`, {
					name: 'size',
					label: 'Size',
					field_type: 'select',
					sort_order: 0
				}, auth())
				fieldId = fieldRes.data.field.id

				const optRes = await api.post(`/admin/forms/${formId}/fields/${fieldId}/options`, {
					label: 'Small',
					value: 'small',
					sort_order: 0
				}, auth())
				optionId = optRes.data.option.id
			})

			afterAll(async () => {
				await api.delete(`/admin/forms/${formId}`, auth()).catch(() => {})
			})

			it('POST /admin/forms/:id/fields/:fieldId/options creates an option', async () => {
				expect(optionId).toBeDefined()
			})

			it('POST /admin/forms/:id/fields/:fieldId/options/:optionId updates an option', async () => {
				const res = await api.post(
					`/admin/forms/${formId}/fields/${fieldId}/options/${optionId}`,
					{ label: 'Small (S)' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.option.label).toBe('Small (S)')
			})

			it('DELETE /admin/forms/:id/fields/:fieldId/options/:optionId deletes an option', async () => {
				const created = await api.post(`/admin/forms/${formId}/fields/${fieldId}/options`, {
					label: 'Extra Large',
					value: 'xl',
					sort_order: 3
				}, auth())
				const id = created.data.option.id

				const res = await api.delete(`/admin/forms/${formId}/fields/${fieldId}/options/${id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(id)
			})

			it('DELETE /admin/forms/:id/fields/:fieldId/options bulk deletes options', async () => {
				const [a, b] = await Promise.all([
					api.post(`/admin/forms/${formId}/fields/${fieldId}/options`, { label: 'Medium', value: 'medium', sort_order: 1 }, auth()),
					api.post(`/admin/forms/${formId}/fields/${fieldId}/options`, { label: 'Large', value: 'large', sort_order: 2 }, auth())
				])
				const ids = [a.data.option.id, b.data.option.id]

				const res = await api.delete(`/admin/forms/${formId}/fields/${fieldId}/options`, {
					data: { ids },
					...auth()
				})
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})
		})

		// ── Form Submissions ───────────────────────────────────────────────────────

		describe('Form Submissions', () => {
			let formId: string
			let submissionId: string
			let submissionId2: string
			const ts = Date.now()

			beforeAll(async () => {
				const formRes = await api.post('/admin/forms', {
					name: `Submission Test ${ts}`,
					handle: `submission-test-${ts}`,
					active: true,
					turnstile_enabled: false,
					form_fields: [
						{ name: 'message', label: 'Message', field_type: 'textarea', required: false }
					]
				}, auth())
				formId = formRes.data.form.id

				// Create submissions via the store endpoint
				const [r1, r2] = await Promise.all([
					api.post(`/forms/submission-test-${ts}`, { data: { message: 'Hello from test 1' } }),
					api.post(`/forms/submission-test-${ts}`, { data: { message: 'Hello from test 2' } })
				])
				expect(r1.status).toBe(201)
				expect(r2.status).toBe(201)

				const listRes = await api.get('/admin/form-submissions', auth())
				const subs = listRes.data.form_submissions.filter((s: any) => s.form_id === formId)
				submissionId = subs[0].id
				submissionId2 = subs[1].id
			})

			afterAll(async () => {
				await api.delete(`/admin/forms/${formId}`, auth()).catch(() => {})
			})

			it('GET /admin/form-submissions lists submissions', async () => {
				const res = await api.get('/admin/form-submissions', auth())
				expect(res.status).toBe(200)
				expect(Array.isArray(res.data.form_submissions)).toBe(true)
				expect(res.data.count).toBeGreaterThanOrEqual(2)
			})

			it('GET /admin/form-submissions filters by form_id', async () => {
				const res = await api.get(`/admin/form-submissions?form_id=${formId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.form_submissions.every((s: any) => s.form_id === formId)).toBe(true)
				expect(res.data.form_submissions.length).toBeGreaterThanOrEqual(2)
			})

			it('GET /admin/form-submissions filters by status=new', async () => {
				const res = await api.get('/admin/form-submissions?status=new', auth())
				expect(res.status).toBe(200)
				expect(res.data.form_submissions.every((s: any) => s.status === 'new')).toBe(true)
			})

			it('GET /admin/form-submissions/:id retrieves a submission', async () => {
				const res = await api.get(`/admin/form-submissions/${submissionId}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.form_submission.id).toBe(submissionId)
				expect(res.data.form_submission.status).toBe('new')
				expect(res.data.form_submission.data).toMatchObject({ message: expect.any(String) })
			})

			it('POST /admin/form-submissions/:id updates status', async () => {
				const res = await api.post(
					`/admin/form-submissions/${submissionId}`,
					{ status: 'read' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.form_submission.status).toBe('read')
			})

			it('POST /admin/form-submissions/:id updates status to archived', async () => {
				const res = await api.post(
					`/admin/form-submissions/${submissionId}`,
					{ status: 'archived' },
					auth()
				)
				expect(res.status).toBe(200)
				expect(res.data.form_submission.status).toBe('archived')
			})

			it('DELETE /admin/form-submissions/:id deletes a submission', async () => {
				const subRes = await api.post(`/forms/submission-test-${ts}`, {
					data: { message: 'to delete' }
				})
				const listRes = await api.get(`/admin/form-submissions?form_id=${formId}`, auth())
				const sub = listRes.data.form_submissions.find((s: any) => s.data?.message === 'to delete')

				const res = await api.delete(`/admin/form-submissions/${sub.id}`, auth())
				expect(res.status).toBe(200)
				expect(res.data.deleted).toContain(sub.id)
			})

			it('DELETE /admin/form-submissions bulk deletes submissions', async () => {
				const ids = [submissionId, submissionId2]
				const res = await api.delete('/admin/form-submissions', { data: { ids }, ...auth() })
				expect(res.status).toBe(200)
				expect(res.data.deleted).toEqual(expect.arrayContaining(ids))
			})
		})

		// ── Turnstile Validation ──────────────────────────────────────────────────

		describe('Turnstile validation', () => {
			let formHandle: string
			const ts = Date.now()

			beforeAll(async () => {
				formHandle = `turnstile-test-${ts}`
				await api.post('/admin/forms', {
					name: `Turnstile Test ${ts}`,
					handle: formHandle,
					active: true,
					turnstile_enabled: true
				}, auth())
			})

			afterAll(async () => {
				const listRes = await api.get('/admin/forms', auth())
				const form = listRes.data.forms.find((f: any) => f.handle === formHandle)
				if (form) await api.delete(`/admin/forms/${form.id}`, auth()).catch(() => {})
			})

			it('returns 400 when token is missing', async () => {
				const res = await api
					.post(`/forms/${formHandle}`, { data: {} })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('returns 201 when token passes Cloudflare verification', async () => {
				const res = await api.post(`/forms/${formHandle}`, {
					data: {},
					token: 'XXXX.DUMMY.TOKEN.XXXX'
				})
				expect(res.status).toBe(201)
				expect(res.data.submitted).toBe(true)
			})
		})

		// ── Store Endpoint ─────────────────────────────────────────────────────────

		describe('Store — POST /forms/:handle', () => {
			const ts = Date.now()

			let activeFormHandle: string
			let inactiveFormHandle: string
			let requiredFieldFormHandle: string

			beforeAll(async () => {
				activeFormHandle = `store-active-${ts}`
				inactiveFormHandle = `store-inactive-${ts}`
				requiredFieldFormHandle = `store-required-${ts}`

				await Promise.all([
					api.post('/admin/forms', {
						name: 'Store Active',
						handle: activeFormHandle,
						active: true,
						turnstile_enabled: false
					}, auth()),
					api.post('/admin/forms', {
						name: 'Store Inactive',
						handle: inactiveFormHandle,
						active: false,
						turnstile_enabled: false
					}, auth()),
					api.post('/admin/forms', {
						name: 'Store Required Fields',
						handle: requiredFieldFormHandle,
						active: true,
						turnstile_enabled: false,
						form_fields: [
							{ name: 'email', label: 'Email', field_type: 'email', required: true, sort_order: 0 }
						]
					}, auth())
				])
			})

			afterAll(async () => {
				const listRes = await api.get('/admin/forms', auth())
				const ids = listRes.data.forms
					.filter((f: any) => [activeFormHandle, inactiveFormHandle, requiredFieldFormHandle].includes(f.handle))
					.map((f: any) => f.id)
				if (ids.length > 0) {
					await api.delete('/admin/forms', { data: { ids }, ...auth() }).catch(() => {})
				}
			})

			it('returns 404 for unknown handle', async () => {
				const res = await api
					.post('/forms/does-not-exist', { data: {} })
					.catch((e: any) => e.response)
				expect(res.status).toBe(404)
			})

			it('returns 400 for inactive form', async () => {
				const res = await api
					.post(`/forms/${inactiveFormHandle}`, { data: {} })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('returns 400 when required field is missing', async () => {
				const res = await api
					.post(`/forms/${requiredFieldFormHandle}`, { data: {} })
					.catch((e: any) => e.response)
				expect(res.status).toBe(400)
			})

			it('returns 201 on valid submission', async () => {
				const res = await api.post(`/forms/${activeFormHandle}`, {
					data: { message: 'Hello from store test' }
				})
				expect(res.status).toBe(201)
				expect(res.data.submitted).toBe(true)
			})

			it('returns 201 when required fields are satisfied', async () => {
				const res = await api.post(`/forms/${requiredFieldFormHandle}`, {
					data: { email: 'store-test@example.com' }
				})
				expect(res.status).toBe(201)
				expect(res.data.submitted).toBe(true)
			})
		})
	}
})
