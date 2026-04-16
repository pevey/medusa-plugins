import { useState } from 'react'
import { LoaderFunctionArgs, UIMatch, useNavigate, useParams } from 'react-router-dom'
import { Badge, Button, Container, Heading, Text, toast, usePrompt } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { sdk } from '../../../../lib/sdk'
import { ActionMenu } from '../../../../components/action-menu'
import { EditFormDrawer } from '../../../../components/edit-form-drawer'
import { FormFieldOptionsModal } from '../../../../components/form-field-options-modal'
import { useForm, useDeleteForm } from '../../../../hooks/forms'
import {
	FORM_FIELD_TYPE_OPTIONS,
	ENUMERABLE_FIELD_TYPES
} from '../../../../components/form-fields-editor'
import { AdminFormField } from '../../../../types'

type LoaderData = { form: { id: string; name: string } }

export async function loader({ params }: LoaderFunctionArgs) {
	const { id } = params
	return sdk.client.fetch<LoaderData>(`/admin/forms/${id}`, {
		query: { fields: 'id,name' }
	})
}

export const handle = {
	breadcrumb: ({ data }: UIMatch<LoaderData>) => data?.form?.name || data?.form?.id || 'Form'
}

const fieldTypeLabel = (type: string) =>
	FORM_FIELD_TYPE_OPTIONS.find(o => o.value === type)?.label ?? type

const FormDetailPage = () => {
	const { id } = useParams()
	const [editOpen, setEditOpen] = useState(false)
	const [optionsField, setOptionsField] = useState<AdminFormField | null>(null)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useForm(id)
	const form = data?.form

	const { mutate: deleteForm } = useDeleteForm()

	const handleDelete = async () => {
		const confirmed = await prompt({
			title: 'Delete form?',
			description:
				'This will also delete all associated fields and submissions. This action cannot be undone.',
			confirmText: 'Delete',
			cancelText: 'Cancel',
			variant: 'danger'
		})
		if (confirmed) {
			deleteForm(id!, {
				onSuccess: () => {
					toast.success('Form deleted')
					navigate('/settings/forms')
				},
				onError: () => toast.error('Failed to delete form')
			})
		}
	}

	if (isLoading)
		return (
			<Container className="p-6">
				<Text>Loading...</Text>
			</Container>
		)
	if (!form)
		return (
			<Container className="p-6">
				<Text>Form not found.</Text>
			</Container>
		)

	const fields = [...(form.form_fields ?? [])].sort((a, b) => a.sort_order - b.sort_order)

	return (
		<div className="flex flex-col gap-4 p-4">
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Form Details</Heading>
					<ActionMenu
						groups={[
							{
								actions: [
									{
										label: 'Edit',
										icon: <PencilSquare />,
										onClick: () => setEditOpen(true)
									},
									{ label: 'Delete', icon: <Trash />, onClick: handleDelete }
								]
							}
						]}
					/>
				</div>

				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Name
					</Text>
					<Text size="small" leading="compact">
						{form.name}
					</Text>
				</div>

				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Handle
					</Text>
					<Text size="small" leading="compact" className="font-mono">
						{form.handle}
					</Text>
				</div>

				{form.description && (
					<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
						<Text size="small" weight="plus" leading="compact">
							Description
						</Text>
						<Text size="small" leading="compact">
							{form.description}
						</Text>
					</div>
				)}

				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Status
					</Text>
					<Badge size="xsmall" color={form.active ? 'green' : 'grey'}>
						{form.active ? 'Active' : 'Inactive'}
					</Badge>
				</div>

				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Turnstile
					</Text>
					<Badge size="xsmall" color={form.turnstile_enabled ? 'blue' : 'grey'}>
						{form.turnstile_enabled ? 'Required' : 'Disabled'}
					</Badge>
				</div>

				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Notification Emails
					</Text>
					<Text size="small" leading="compact">
						{form.notification_emails?.length
							? form.notification_emails.join(', ')
							: '—'}
					</Text>
				</div>

				<div className="text-ui-fg-subtle grid grid-cols-2 items-center px-6 py-4">
					<Text size="small" weight="plus" leading="compact">
						Store Endpoint
					</Text>
					<Text size="small" leading="compact" className="font-mono text-xs break-all">
						POST /forms/{form.handle}
					</Text>
				</div>
			</Container>

			{fields.length > 0 && (
				<Container className="divide-y p-0">
					<div className="flex items-center justify-between px-6 py-4">
						<Heading level="h2">Fields</Heading>
						<Button size="small" variant="secondary" onClick={() => setEditOpen(true)}>
							Edit
						</Button>
					</div>
					<div className="grid grid-cols-[1fr_1fr_120px_60px] gap-x-4 px-6 py-2">
						<Text size="xsmall" className="text-ui-fg-muted">
							Label
						</Text>
						<Text size="xsmall" className="text-ui-fg-muted">
							Name
						</Text>
						<Text size="xsmall" className="text-ui-fg-muted">
							Type
						</Text>
						<Text size="xsmall" className="text-ui-fg-muted">
							Required
						</Text>
					</div>
					{fields.map(field => {
						const isEnumerable = ENUMERABLE_FIELD_TYPES.has(field.field_type)
						return (
							<div
								key={field.id}
								className={`grid grid-cols-[1fr_1fr_120px_60px] gap-x-4 items-center px-6 py-3${isEnumerable ? ' cursor-pointer hover:bg-ui-bg-subtle-hover' : ''}`}
								onClick={isEnumerable ? () => setOptionsField(field) : undefined}
							>
								<Text size="small">{field.label}</Text>
								<Text size="small" className="font-mono text-xs text-ui-fg-subtle">
									{field.name}
								</Text>
								<div className="flex items-center gap-x-2">
									<Badge size="xsmall" color="grey">
										{fieldTypeLabel(field.field_type)}
									</Badge>
									{isEnumerable && (
										<Text size="xsmall" className="text-ui-fg-muted">
											{field.field_options?.length ?? 0} opts
										</Text>
									)}
								</div>
								<Badge size="xsmall" color={field.required ? 'orange' : 'grey'}>
									{field.required ? 'Yes' : 'No'}
								</Badge>
							</div>
						)
					})}
				</Container>
			)}

			{fields.length === 0 && (
				<Container className="p-6">
					<Text className="text-ui-fg-subtle" size="small">
						No fields defined.{' '}
						<button
							type="button"
							className="text-ui-fg-interactive underline"
							onClick={() => setEditOpen(true)}
						>
							Add fields
						</button>
					</Text>
				</Container>
			)}

			<EditFormDrawer form={form} open={editOpen} setOpen={setEditOpen} />
			{optionsField && (
				<FormFieldOptionsModal
					formId={form.id}
					field={optionsField}
					open={!!optionsField}
					setOpen={open => {
						if (!open) setOptionsField(null)
					}}
					onSaved={() => setOptionsField(null)}
				/>
			)}
		</div>
	)
}

export default FormDetailPage
