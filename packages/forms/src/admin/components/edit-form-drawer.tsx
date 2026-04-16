import * as zod from 'zod'
import { Button, Drawer, Heading, Input, Label, Switch, Text, Textarea, toast } from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useBlocker } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useUpdateForm } from '../hooks/forms'
import { AdminForm } from '../types'
import { FormFieldInput, FormFieldsEditor } from './form-fields-editor'

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	handle: zod
		.string()
		.min(1, 'Required')
		.regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
	description: zod.string().optional().nullable(),
	active: zod.boolean(),
	turnstile_enabled: zod.boolean(),
	notification_emails: zod.string().optional()
})

type FormData = zod.infer<typeof schema>

function toFormFieldInputs(fields: AdminForm['form_fields']): FormFieldInput[] {
	return [...(fields ?? [])]
		.sort((a, b) => a.sort_order - b.sort_order)
		.map(f => ({
			_key: f.id,
			id: f.id,
			name: f.name,
			label: f.label,
			field_type: f.field_type,
			required: f.required,
			sort_order: f.sort_order
		}))
}

type Props = {
	form: AdminForm
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditFormDrawer = ({ form, open, setOpen }: Props) => {
	const { mutateAsync: updateForm, isPending: saving } = useUpdateForm(form.id)
	const [fields, setFields] = useState<FormFieldInput[]>([])

	const rhf = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: form.name,
			handle: form.handle,
			description: form.description ?? '',
			active: form.active,
			turnstile_enabled: form.turnstile_enabled,
			notification_emails: (form.notification_emails ?? []).join(', ')
		}
	})

	const {
		formState: { isDirty },
		reset,
		control
	} = rhf

	// Re-populate when form changes or drawer opens
	useEffect(() => {
		if (open && form?.id) {
			reset({
				name: form.name,
				handle: form.handle,
				description: form.description ?? '',
				active: form.active,
				turnstile_enabled: form.turnstile_enabled,
				notification_emails: (form.notification_emails ?? []).join(', ')
			})
			setFields(toFormFieldInputs(form.form_fields ?? []))
		}
	}, [form?.id, open])

	useBlocker(() => {
		if (open && isDirty) return !window.confirm('You have unsaved changes. Leave anyway?')
		return false
	})

	const onSubmit = rhf.handleSubmit(async ({ notification_emails: emailStr, ...data }) => {
		const notification_emails = emailStr
			? emailStr
					.split(/[,\n]+/)
					.map(e => e.trim())
					.filter(Boolean)
			: null
		try {
			await updateForm({
				...data,
				notification_emails,
				form_fields: fields.map((f, i) => ({
					id: f.id,
					name: f.name,
					label: f.label,
					field_type: f.field_type,
					required: f.required,
					sort_order: f.sort_order ?? i
				}))
			})
			toast.success('Form updated')
			setOpen(false)
		} catch {
			toast.error('Failed to update form')
		}
	})

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<form onSubmit={onSubmit} className="flex flex-col h-full">
					<Drawer.Header>
						<Heading level="h2">Edit Form</Heading>
					</Drawer.Header>
					<Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto">
						<div className="flex flex-col gap-y-4">
							<div className="flex flex-col gap-y-1">
								<Label htmlFor="eft-name" size="small" weight="plus">
									Name
								</Label>
								<Controller
									name="name"
									control={control}
									render={({ field, fieldState }) => (
										<>
											<Input id="eft-name" {...field} />
											{fieldState.error && (
												<Text size="small" className="text-ui-fg-error">
													{fieldState.error.message}
												</Text>
											)}
										</>
									)}
								/>
							</div>

							<div className="flex flex-col gap-y-1">
								<Label htmlFor="eft-handle" size="small" weight="plus">
									Handle
								</Label>
								<Controller
									name="handle"
									control={control}
									render={({ field, fieldState }) => (
										<>
											<Input id="eft-handle" {...field} className="font-mono" />
											{fieldState.error && (
												<Text size="small" className="text-ui-fg-error">
													{fieldState.error.message}
												</Text>
											)}
										</>
									)}
								/>
							</div>

							<div className="flex flex-col gap-y-1">
								<Label htmlFor="eft-desc" size="small" weight="plus">
									Description{' '}
									<span className="text-ui-fg-subtle font-normal">(optional)</span>
								</Label>
								<Controller
									name="description"
									control={control}
									render={({ field }) => (
										<Textarea id="eft-desc" {...field} value={field.value ?? ''} />
									)}
								/>
							</div>

							<div className="flex items-center justify-between rounded-lg border border-ui-border-base p-3">
								<div>
									<Label htmlFor="eft-active" size="small" weight="plus">
										Active
									</Label>
									<Text size="small" className="text-ui-fg-subtle">
										Inactive forms reject new submissions.
									</Text>
								</div>
								<Controller
									name="active"
									control={control}
									render={({ field }) => (
										<Switch
											id="eft-active"
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									)}
								/>
							</div>

							<div className="flex items-center justify-between rounded-lg border border-ui-border-base p-3">
								<div>
									<Label htmlFor="eft-turnstile" size="small" weight="plus">
										Require Turnstile
									</Label>
									<Text size="small" className="text-ui-fg-subtle">
										Validate Cloudflare Turnstile token on submission.
									</Text>
								</div>
								<Controller
									name="turnstile_enabled"
									control={control}
									render={({ field }) => (
										<Switch
											id="eft-turnstile"
											checked={field.value}
											onCheckedChange={field.onChange}
										/>
									)}
								/>
							</div>

							<div className="flex flex-col gap-y-1">
								<Label htmlFor="eft-emails" size="small" weight="plus">
									Notification Emails
								</Label>
								<Text size="xsmall" className="text-ui-fg-subtle">
									Comma-separated email addresses to notify on new submissions.
								</Text>
								<Controller
									name="notification_emails"
									control={control}
									render={({ field }) => (
										<Textarea
											id="eft-emails"
											{...field}
											value={field.value ?? ''}
											placeholder="admin@example.com, support@example.com"
											rows={2}
										/>
									)}
								/>
							</div>
						</div>

						<div className="flex flex-col gap-y-3">
							<Heading level="h3">Fields</Heading>
							<FormFieldsEditor fields={fields} onChange={setFields} />
						</div>
					</Drawer.Body>
					<Drawer.Footer className="flex justify-end gap-x-2">
						<Button
							type="button"
							variant="secondary"
							size="small"
							onClick={() => setOpen(false)}
							disabled={saving}
						>
							Cancel
						</Button>
						<Button type="submit" size="small" isLoading={saving} disabled={saving}>
							Save
						</Button>
					</Drawer.Footer>
				</form>
			</Drawer.Content>
		</Drawer>
	)
}
