import * as zod from 'zod'
import {
	Button,
	FocusModal,
	Heading,
	Input,
	Label,
	Switch,
	Text,
	Textarea,
	toast
} from '@medusajs/ui'
import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { useBlocker } from 'react-router-dom'
import { zodResolver } from '@hookform/resolvers/zod'
import { useCreateForm } from '../hooks/forms'
import { FormFieldInput, FormFieldsEditor } from './form-fields-editor'

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	handle: zod
		.string()
		.min(1, 'Required')
		.regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers, hyphens only'),
	description: zod.string().optional(),
	active: zod.boolean(),
	turnstile_enabled: zod.boolean(),
	notification_emails: zod.string().optional()
})

type FormData = zod.infer<typeof schema>

function toHandle(name: string) {
	return name
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '-')
		.replace(/[^a-z0-9-]/g, '')
}

type Props = { open: boolean; setOpen: (open: boolean) => void }

export const CreateFormModal = ({ open, setOpen }: Props) => {
	const { mutateAsync: createForm, isPending } = useCreateForm()
	const [fields, setFields] = useState<FormFieldInput[]>([])

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: '',
			handle: '',
			description: '',
			active: true,
			turnstile_enabled: true,
			notification_emails: ''
		}
	})

	const {
		formState: { isDirty },
		reset,
		control,
		watch,
		setValue
	} = form

	useEffect(() => {
		if (!open) {
			reset()
			setFields([])
		}
	}, [open, reset])

	useBlocker(() => {
		if (open && (isDirty || fields.length > 0)) {
			return !window.confirm('You have unsaved changes. Leave anyway?')
		}
		return false
	})

	const nameValue = watch('name')
	const handleValue = watch('handle')

	// Auto-derive handle from name while it hasn't been manually edited
	useEffect(() => {
		const derived = toHandle(nameValue)
		if (handleValue === '' || handleValue === toHandle(nameValue.slice(0, -1))) {
			setValue('handle', derived, { shouldDirty: false })
		}
	}, [nameValue])

	const onSubmit = form.handleSubmit(async ({ notification_emails: emailStr, ...data }) => {
		const notification_emails = emailStr
			? emailStr
					.split(/[,\n]+/)
					.map(e => e.trim())
					.filter(Boolean)
			: null
		try {
			await createForm({
				...data,
				notification_emails,
				form_fields: fields.map((f, i) => ({
					name: f.name,
					label: f.label,
					field_type: f.field_type,
					required: f.required,
					sort_order: f.sort_order ?? i
				}))
			})
			toast.success('Form created')
			setOpen(false)
		} catch {
			toast.error('Failed to create form')
		}
	})

	return (
		<FocusModal open={open} onOpenChange={setOpen}>
			<FocusModal.Content>
				<form onSubmit={onSubmit} className="flex flex-col h-full">
					<FocusModal.Header />
					<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
						<div className="flex w-full max-w-2xl flex-col gap-y-8 py-16 pb-8">
							<Heading level="h1">Create Form</Heading>

							<div className="flex flex-col gap-y-4">
								<div className="flex flex-col gap-y-1">
									<Label htmlFor="ft-name" size="small" weight="plus">
										Name
									</Label>
									<Controller
										name="name"
										control={control}
										render={({ field, fieldState }) => (
											<>
												<Input id="ft-name" {...field} placeholder="Contact Us" />
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
									<Label htmlFor="ft-handle" size="small" weight="plus">
										Handle
									</Label>
									<Controller
										name="handle"
										control={control}
										render={({ field, fieldState }) => (
											<>
												<Input
													id="ft-handle"
													{...field}
													placeholder="contact-us"
													className="font-mono"
												/>
												{fieldState.error && (
													<Text size="small" className="text-ui-fg-error">
														{fieldState.error.message}
													</Text>
												)}
											</>
										)}
									/>
									<Text size="xsmall" className="text-ui-fg-subtle">
										Used in the store API: POST /forms/&#123;handle&#125;
									</Text>
								</div>

								<div className="flex flex-col gap-y-1">
									<Label htmlFor="ft-desc" size="small" weight="plus">
										Description{' '}
										<span className="text-ui-fg-subtle font-normal">(optional)</span>
									</Label>
									<Controller
										name="description"
										control={control}
										render={({ field }) => (
											<Textarea
												id="ft-desc"
												{...field}
												placeholder="Optional description…"
											/>
										)}
									/>
								</div>

								<div className="flex items-center justify-between rounded-lg border border-ui-border-base p-4">
									<div>
										<Label htmlFor="ft-active" size="small" weight="plus">
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
												id="ft-active"
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										)}
									/>
								</div>

								<div className="flex items-center justify-between rounded-lg border border-ui-border-base p-4">
									<div>
										<Label htmlFor="ft-turnstile" size="small" weight="plus">
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
												id="ft-turnstile"
												checked={field.value}
												onCheckedChange={field.onChange}
											/>
										)}
									/>
								</div>
							</div>

							<div className="flex flex-col gap-y-1">
								<Label htmlFor="ft-emails" size="small" weight="plus">
									Notification Emails{' '}
									<span className="text-ui-fg-subtle font-normal">(optional)</span>
								</Label>
								<Text size="xsmall" className="text-ui-fg-subtle">
									Comma-separated email addresses to notify on new submissions.
								</Text>
								<Controller
									name="notification_emails"
									control={control}
									render={({ field }) => (
										<Textarea
											id="ft-emails"
											{...field}
											value={field.value ?? ''}
											placeholder="admin@example.com, support@example.com"
											rows={2}
										/>
									)}
								/>
							</div>

							<div className="flex flex-col gap-y-3">
								<div>
									<Heading level="h2">Fields</Heading>
									<Text size="small" className="text-ui-fg-subtle mt-1">
										Define the fields this form collects.
									</Text>
								</div>
								<FormFieldsEditor fields={fields} onChange={setFields} />
							</div>
						</div>
					</FocusModal.Body>
					<FocusModal.Footer className="flex w-full items-end justify-end gap-x-2">
						<Button
							type="button"
							variant="secondary"
							size="small"
							onClick={() => setOpen(false)}
							disabled={isPending}
						>
							Cancel
						</Button>
						<Button type="submit" size="small" isLoading={isPending} disabled={isPending}>
							Create
						</Button>
					</FocusModal.Footer>
				</form>
			</FocusModal.Content>
		</FocusModal>
	)
}
