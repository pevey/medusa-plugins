import * as zod from 'zod'
import {
	Badge,
	Button,
	FocusModal,
	Heading,
	Input,
	InlineTip,
	Label,
	RadioGroup,
	Select,
	Text,
	Textarea,
	toast
} from '@medusajs/ui'
import { Plus, Trash } from '@medusajs/icons'
import { useEffect } from 'react'
import { Controller, FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useBlocker } from 'react-router-dom'
import { useMutation } from '@tanstack/react-query'
import { sdk } from '../lib/sdk'
import { useCreateWebhookAction, useWebhookSecrets } from '../hooks/webhooks'
import { MEDUSA_EVENTS, EventPayloadField } from '../lib/medusa-events'
import {
	MEDUSA_WORKFLOWS,
	MEDUSA_WORKFLOW_CATEGORIES,
	MEDUSA_WORKFLOWS_BY_NAME,
	flattenWorkflowInputPaths,
	renderWorkflowInputShape
} from '../lib/medusa-workflows'
import { MEDUSA_ENTITIES } from '../lib/medusa-entities'

// ─── Types ────────────────────────────────────────────────────────────────────

import { TriggerType, ActionType, RequestMethod, FieldMapping, StaticValue } from '../types'

// ─── StaticValuesEditor ───────────────────────────────────────────────────────

const StaticValuesEditor = ({
	value,
	onChange
}: {
	value: StaticValue[]
	onChange: (v: StaticValue[]) => void
}) => {
	const addRow = () => onChange([...value, { key: '', value: '' }])
	const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i))
	const update = (i: number, field: keyof StaticValue, v: string) => {
		const next = [...value]
		next[i] = { ...next[i], [field]: v }
		onChange(next)
	}

	return (
		<div className="flex flex-col gap-3">
			{value.length > 0 && (
				<div className="grid grid-cols-[1fr_1fr_auto] gap-2">
					<Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">
						Key (dot path)
					</Text>
					<Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">
						Value
					</Text>
					<span />
				</div>
			)}
			{value.map((row, i) => (
				<div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
					<Input
						placeholder="e.g. source or customer.type"
						value={row.key}
						onChange={e => update(i, 'key', e.target.value)}
					/>
					<Input
						placeholder="e.g. my-system"
						value={row.value}
						onChange={e => update(i, 'value', e.target.value)}
					/>
					<Button type="button" size="small" variant="secondary" onClick={() => removeRow(i)}>
						<Trash />
					</Button>
				</div>
			))}
			<Button type="button" size="small" variant="secondary" onClick={addRow}>
				<Plus /> Add Static Value
			</Button>
		</div>
	)
}

// ─── FieldsEditor ─────────────────────────────────────────────────────────────

const FieldsEditor = ({
	value,
	onChange
}: {
	value: string[]
	onChange: (v: string[]) => void
}) => {
	const addRow = () => onChange([...value, ''])
	const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i))
	const update = (i: number, v: string) => {
		const next = [...value]
		next[i] = v
		onChange(next)
	}

	return (
		<div className="flex flex-col gap-2">
			{value.map((field, i) => (
				<div key={i} className="flex gap-2 items-center">
					<Input
						placeholder="e.g. id, total, customer.*, items.*"
						value={field}
						onChange={e => update(i, e.target.value)}
						className="flex-1"
					/>
					<Button type="button" size="small" variant="secondary" onClick={() => removeRow(i)}>
						<Trash />
					</Button>
				</div>
			))}
			<Button type="button" size="small" variant="secondary" onClick={addRow}>
				<Plus /> Add Field
			</Button>
		</div>
	)
}

// ─── Schema ──────────────────────────────────────────────────────────────────

const querySchema = zod
	.object({
		entity_name: zod.string().min(1, 'Required'),
		fields: zod.array(zod.string()).optional(),
		filters_json: zod.string().optional(),
		limit: zod.coerce.number().int().min(1).max(100).optional()
	})
	.nullable()
	.optional()

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	description: zod.string().optional(),
	is_active: zod.boolean().optional(),
	action_type: zod.enum(['outgoing_webhook', 'outgoing_request', 'medusa_workflow'] satisfies [ActionType, ...ActionType[]]),
	target_url: zod.string().optional(),
	signing_secret_id: zod.string().nullable().optional(),
	request_method: zod.enum(['GET', 'POST', 'PUT', 'DELETE'] satisfies [RequestMethod, ...RequestMethod[]]).optional(),
	target_headers: zod
		.array(zod.object({ key: zod.string().min(1), value: zod.string() }))
		.optional(),
	medusa_workflow: zod.string().optional(),
	field_mappings: zod
		.array(
			zod.object({
				source_path: zod.string().min(1, 'Required'),
				target_key: zod.string().min(1, 'Required')
			})
		)
		.optional(),
	static_values: zod
		.array(zod.object({ key: zod.string().min(1), value: zod.string() }))
		.optional(),
	query: querySchema
})

type FormData = zod.infer<typeof schema>
type QueryFormData = NonNullable<NonNullable<FormData['query']>>

// ─── Payload-path helpers ─────────────────────────────────────────────────────

function flattenEventPayloadPaths(fields: EventPayloadField[], prefix = ''): string[] {
	const paths: string[] = []
	for (const field of fields) {
		const path = prefix ? `${prefix}.${field.key}` : field.key
		paths.push(path)
		if (field.type === 'object' && field.fields) {
			paths.push(...flattenEventPayloadPaths(field.fields, path))
		}
	}
	return paths
}

function getSourcePathsForEvents(eventNames: string[]): string[] {
	const paths = new Set<string>()
	for (const name of eventNames) {
		const event = MEDUSA_EVENTS.find(e => e.name === name)
		if (event) flattenEventPayloadPaths(event.payload).forEach(p => paths.add(p))
	}
	return Array.from(paths).sort()
}

// Derive source paths available from a query result using its configured fields.
// Each field is prefixed with the entity name (e.g. "order.total").
function getQueryResultPaths(entityName: string, fields: string[]): string[] {
	return fields.filter(Boolean).map(f => `${entityName}.${f}`)
}

// ─── FieldMappingEditor ───────────────────────────────────────────────────────

const FieldMappingEditor = ({
	triggerType,
	triggerEvents,
	actionType,
	requestMethod,
	medusaWorkflow,
	queryConfig,
	value,
	onChange
}: {
	triggerType: TriggerType
	triggerEvents: string[]
	actionType: ActionType
	requestMethod?: RequestMethod
	medusaWorkflow: string
	queryConfig?: QueryFormData | null
	value: FieldMapping[]
	onChange: (v: FieldMapping[]) => void
}) => {
	const eventSourcePaths =
		triggerType === 'medusa_event' ? getSourcePathsForEvents(triggerEvents) : []

	const querySourcePaths =
		triggerType === 'medusa_event' && queryConfig?.entity_name
			? getQueryResultPaths(queryConfig.entity_name, queryConfig.fields ?? [])
			: []

	const workflowDef =
		actionType === 'medusa_workflow' ? MEDUSA_WORKFLOWS_BY_NAME[medusaWorkflow] : null
	const workflowTargetPaths = workflowDef ? flattenWorkflowInputPaths(workflowDef.inputFields) : []

	const sourceIsDropdown = triggerType === 'medusa_event'
	const targetIsDropdown = actionType === 'medusa_workflow' && workflowTargetPaths.length > 0

	const sourceLabel =
		triggerType === 'medusa_event' ? 'Event / Query Field' : 'Incoming Field (dot path)'
	const targetLabel =
		actionType === 'medusa_workflow'
			? 'Workflow Input Field'
			: actionType === 'outgoing_request' && requestMethod === 'GET'
				? 'Query Param Key'
				: 'Outgoing Key'

	const addRow = () => onChange([...value, { source_path: '', target_key: '' }])
	const removeRow = (i: number) => onChange(value.filter((_, idx) => idx !== i))
	const update = (i: number, field: keyof FieldMapping, v: string) => {
		const next = [...value]
		next[i] = { ...next[i], [field]: v }
		onChange(next)
	}

	return (
		<div className="flex flex-col gap-3">
			<div className="grid grid-cols-[1fr_1fr_auto] gap-2">
				<Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">
					{sourceLabel}
				</Text>
				<Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">
					{targetLabel}
				</Text>
				<span />
			</div>

			{value.map((row, i) => (
				<div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center">
					{sourceIsDropdown ? (
						<Select value={row.source_path} onValueChange={v => update(i, 'source_path', v)}>
							<Select.Trigger>
								<Select.Value placeholder="Select field…" />
							</Select.Trigger>
							<Select.Content>
								{eventSourcePaths.length > 0 && (
									<Select.Group>
										<Select.Label>Event Data</Select.Label>
										{eventSourcePaths.map(p => (
											<Select.Item key={p} value={p}>
												{p}
											</Select.Item>
										))}
									</Select.Group>
								)}
								{querySourcePaths.length > 0 && (
									<Select.Group>
										<Select.Label>{queryConfig!.entity_name} (query result)</Select.Label>
										{querySourcePaths.map(p => (
											<Select.Item key={p} value={p}>
												{p}
											</Select.Item>
										))}
									</Select.Group>
								)}
							</Select.Content>
						</Select>
					) : (
						<Input
							placeholder="e.g. data.customer.email"
							value={row.source_path}
							onChange={e => update(i, 'source_path', e.target.value)}
						/>
					)}

					{targetIsDropdown ? (
						<Select value={row.target_key} onValueChange={v => update(i, 'target_key', v)}>
							<Select.Trigger>
								<Select.Value placeholder="Select field…" />
							</Select.Trigger>
							<Select.Content>
								{workflowDef?.hasAdditionalData && (
									<Select.Group>
										<Select.Label>additional_data (custom)</Select.Label>
										<Select.Item value="additional_data.__custom__">
											additional_data.… (type key below)
										</Select.Item>
									</Select.Group>
								)}
								<Select.Group>
									<Select.Label>Workflow Input</Select.Label>
									{workflowTargetPaths.map(p => (
										<Select.Item key={p} value={p}>
											{p}
										</Select.Item>
									))}
								</Select.Group>
							</Select.Content>
						</Select>
					) : (
						<Input
							placeholder={
								actionType === 'medusa_workflow'
									? 'e.g. customersData[].email'
									: 'e.g. customer_email'
							}
							value={row.target_key}
							onChange={e => update(i, 'target_key', e.target.value)}
						/>
					)}

					<Button type="button" size="small" variant="secondary" onClick={() => removeRow(i)}>
						<Trash />
					</Button>
				</div>
			))}

			{workflowDef?.hasAdditionalData && (
				<div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
					<Text size="small" className="text-ui-fg-subtle">
						This workflow accepts <code className="font-mono text-xs">additional_data</code>.
						Map any field to{' '}
						<code className="font-mono text-xs">additional_data.your_key</code> to pass custom
						data through to workflow hooks.
					</Text>
				</div>
			)}

			<Button type="button" size="small" variant="secondary" onClick={addRow}>
				<Plus /> Add Mapping
			</Button>
		</div>
	)
}

// ─── Step header ──────────────────────────────────────────────────────────────

const StepHeader = ({ step, label }: { step: number; label: string }) => (
	<div className="flex items-center gap-3">
		<div className="w-7 h-7 rounded-full border border-ui-border-strong bg-ui-bg-base text-ui-fg-base flex items-center justify-center text-xs font-medium shrink-0">
			{step}
		</div>
		<Heading level="h2">{label}</Heading>
	</div>
)

// ─── Main Form ────────────────────────────────────────────────────────────────

type Props = {
	triggerId: string
	triggerType: TriggerType
	triggerEvents?: string[]
	open: boolean
	setOpen: (open: boolean) => void
}

export const CreateWebhookActionModal = ({
	triggerId,
	triggerType,
	triggerEvents = [],
	open,
	setOpen
}: Props) => {
	const { mutateAsync: createAction, isPending } = useCreateWebhookAction(triggerId)

	const form = useForm<FormData>({
		defaultValues: {
			name: '',
			description: '',
			is_active: true,
			action_type: 'outgoing_webhook',
			target_url: '',
			signing_secret_id: null,
			request_method: 'POST',
			target_headers: [],
			medusa_workflow: '',
			field_mappings: [],
			static_values: [],
			query: null
		}
	})

	const {
		formState: { isDirty },
		reset,
		control,
		setValue
	} = form
	const actionType = useWatch({ control, name: 'action_type' }) as ActionType
	const requestMethod = (useWatch({ control, name: 'request_method' }) ?? 'POST') as RequestMethod
	const medusaWorkflow = useWatch({ control, name: 'medusa_workflow' }) ?? ''
	const queryConfig = useWatch({ control, name: 'query' })
	const workflowDef = MEDUSA_WORKFLOWS_BY_NAME[medusaWorkflow]

	const {
		fields: headerFields,
		append: appendHeader,
		remove: removeHeader
	} = useFieldArray({
		control,
		name: 'target_headers'
	})

	const { data: secretsData } = useWebhookSecrets(open && actionType === 'outgoing_webhook')
	const secrets = secretsData?.secrets ?? []

	useEffect(() => {
		if (!open) reset()
	}, [open, reset])

	useBlocker(() => {
		if (isDirty && open) return !window.confirm('You have unsaved changes. Leave anyway?')
		return false
	})

	const { mutateAsync: upsertQuery } = useMutation({
		mutationFn: ({ actionId, body }: { actionId: string; body: object }) =>
			sdk.client.fetch(`/admin/webhook-triggers/${triggerId}/actions/${actionId}/query`, {
				method: 'POST',
				body
			})
	})

	const onSubmit = form.handleSubmit(async data => {
		const { query, ...actionData } = data
		const payload = { ...actionData }
		if (payload.action_type === 'outgoing_webhook') {
			delete payload.medusa_workflow
			delete payload.request_method
		} else if (payload.action_type === 'outgoing_request') {
			delete payload.medusa_workflow
			delete payload.signing_secret_id
		} else {
			// medusa_workflow
			delete payload.target_url
			delete payload.target_headers
			delete payload.request_method
			delete payload.signing_secret_id
		}

		try {
			const { action } = await createAction(payload)

			if (query?.entity_name) {
				let filters: Record<string, unknown> | undefined
				if (query.filters_json?.trim()) {
					try {
						filters = JSON.parse(query.filters_json)
					} catch {
						toast.error('Query filters must be valid JSON')
						return
					}
				}
				await upsertQuery({
					actionId: action.id,
					body: {
						entity_name: query.entity_name,
						fields: (query.fields ?? []).filter(Boolean),
						filters,
						limit: query.limit ?? 10
					}
				})
			}

			toast.success('Action created')
			setOpen(false)
		} catch {
			toast.error('Failed to create action')
		}
	})

	const isMedusaEvent = triggerType === 'medusa_event'
	const actionReady =
		actionType === 'outgoing_webhook' ||
		actionType === 'outgoing_request' ||
		actionType === 'medusa_workflow'
	const showMapping = actionReady
	const showBody =
		actionType === 'outgoing_request' && (requestMethod === 'POST' || requestMethod === 'PUT')

	// Step numbers shift when the Query step is present
	const queryStepN = 2
	const mappingStepN = isMedusaEvent ? 3 : 2
	const staticStepN = isMedusaEvent ? 4 : 3

	return (
		<FocusModal open={open} onOpenChange={setOpen}>
			<FocusModal.Content>
				<FormProvider {...form}>
					<form onSubmit={onSubmit} className="flex flex-col h-full">
						<FocusModal.Header></FocusModal.Header>
						<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
							<div className="flex w-full max-w-[720px] flex-col gap-y-10 py-16 pb-8">
								<div className="flex flex-col gap-y-4">
									<Heading level="h1">Create Action</Heading>
									<div className="flex flex-col gap-y-4">
										{/* Trigger Context */}
										<div className="flex flex-col gap-y-2">
											<Label size="small" weight="plus" className="leading-compact mb-1">
												Trigger Context
												<Input
													className="mt-1"
													value={
														triggerType === 'medusa_event'
															? 'Medusa Event'
															: 'Incoming Webhook'
													}
													readOnly
												/>
											</Label>
											<Text size="small" className="text-ui-fg-subtle">
												{triggerType === 'medusa_event'
													? 'This action fires when the configured Medusa events occur.'
													: 'This action fires when an external service POSTs to this webhook.'}
											</Text>
											{triggerType === 'medusa_event' && triggerEvents.length > 0 && (
												<div className="flex flex-wrap gap-1">
													{triggerEvents.map(evt => (
														<Badge key={evt} size="xsmall" color="orange">
															{evt}
														</Badge>
													))}
												</div>
											)}
										</div>

										{/* Basic config */}
										<div>
											<Label htmlFor="wa-name" size="small" weight="plus">
												Name
											</Label>
											<Controller
												name="name"
												control={control}
												render={({ field, fieldState }) => (
													<>
														<Input id="wa-name" {...field} placeholder="My Action" />
														{fieldState.error && (
															<Text size="small" className="text-ui-fg-error">
																{fieldState.error.message}
															</Text>
														)}
													</>
												)}
											/>
										</div>
										<div>
											<Label htmlFor="wa-desc" size="small" weight="plus">
												Description
											</Label>
											<Controller
												name="description"
												control={control}
												render={({ field }) => (
													<Textarea
														id="wa-desc"
														{...field}
														placeholder="Optional description…"
													/>
												)}
											/>
										</div>
									</div>

									{/* ── Step 1: Action ────────────────────────────── */}
									<div>
										<StepHeader step={1} label="Action" />
										<Text
											weight="plus"
											size="small"
											className="leading-compact mt-2 mb-1"
										>
											What should happen when the trigger fires?
										</Text>
										<Controller
											name="action_type"
											control={control}
											render={({ field }) => (
												<RadioGroup value={field.value} onValueChange={field.onChange}>
													<label
														htmlFor="act-webhook"
														className={`flex cursor-pointer items-start gap-x-3 rounded-lg border p-4 transition-colors ${field.value === 'outgoing_webhook' ? 'border-ui-border-interactive bg-ui-bg-field' : 'border-ui-border-base bg-ui-bg-base'}`}
													>
														<RadioGroup.Item
															value="outgoing_webhook"
															id="act-webhook"
														/>
														<div>
															<Label
																htmlFor="act-webhook"
																size="small"
																weight="plus"
															>
																Send Outgoing Webhook
															</Label>
															<Text size="small" className="text-ui-fg-subtle">
																POST the signed payload to an external URL with
																HMAC-SHA256 verification.
															</Text>
														</div>
													</label>
													<label
														htmlFor="act-request"
														className={`flex cursor-pointer items-start gap-x-3 rounded-lg border p-4 transition-colors ${field.value === 'outgoing_request' ? 'border-ui-border-interactive bg-ui-bg-field' : 'border-ui-border-base bg-ui-bg-base'}`}
													>
														<RadioGroup.Item
															value="outgoing_request"
															id="act-request"
														/>
														<div>
															<Label
																htmlFor="act-request"
																size="small"
																weight="plus"
															>
																Send Outgoing Request
															</Label>
															<Text size="small" className="text-ui-fg-subtle">
																Send a GET, POST, PUT, or DELETE request to an
																external URL.
															</Text>
														</div>
													</label>
													<label
														htmlFor="act-workflow"
														className={`flex cursor-pointer items-start gap-x-3 rounded-lg border p-4 transition-colors ${field.value === 'medusa_workflow' ? 'border-ui-border-interactive bg-ui-bg-field' : 'border-ui-border-base bg-ui-bg-base'}`}
													>
														<RadioGroup.Item
															value="medusa_workflow"
															id="act-workflow"
														/>
														<div>
															<Label
																htmlFor="act-workflow"
																size="small"
																weight="plus"
															>
																Run Medusa Workflow
															</Label>
															<Text size="small" className="text-ui-fg-subtle">
																Execute a core Medusa workflow with the mapped
																payload as input.
															</Text>
														</div>
													</label>
												</RadioGroup>
											)}
										/>
									</div>

									{/* Outgoing webhook config */}
									{actionType === 'outgoing_webhook' && (
										<div className="flex flex-col gap-y-4">
											<div className="flex flex-col gap-y-1">
												<Label htmlFor="wa-url" size="small" weight="plus">
													Target URL *
												</Label>
												<Controller
													name="target_url"
													control={control}
													render={({ field }) => (
														<Input
															id="wa-url"
															{...field}
															type="url"
															placeholder="https://example.com/webhook"
														/>
													)}
												/>
											</div>
											<div className="flex flex-col gap-y-1">
												<Label size="small" weight="plus">
													Signing Secret
												</Label>
												<Text size="small" className="text-ui-fg-subtle">
													Signs the outgoing payload with HMAC-SHA256. The recipient
													can verify the{' '}
													<code className="font-mono text-xs">
														x-webhook-signature
													</code>{' '}
													header.
												</Text>
												<Controller
													name="signing_secret_id"
													control={control}
													render={({ field }) => (
														<Select
															value={field.value ?? ''}
															onValueChange={v =>
																field.onChange(v === '__none__' ? null : v)
															}
														>
															<Select.Trigger>
																<Select.Value placeholder="None (unsigned)" />
															</Select.Trigger>
															<Select.Content>
																<Select.Item value="__none__">
																	None (unsigned)
																</Select.Item>
																{secrets.map(s => (
																	<Select.Item key={s.id} value={s.id}>
																		{s.label}
																	</Select.Item>
																))}
															</Select.Content>
														</Select>
													)}
												/>
											</div>
											<div className="flex flex-col gap-y-2">
												<Text size="small" weight="plus" leading="compact">
													Custom Headers
												</Text>
												{headerFields.map((item, i) => (
													<div
														key={item.id}
														className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
													>
														<Controller
															name={`target_headers.${i}.key`}
															control={control}
															render={({ field }) => (
																<Input {...field} placeholder="Header name" />
															)}
														/>
														<Controller
															name={`target_headers.${i}.value`}
															control={control}
															render={({ field }) => (
																<Input {...field} placeholder="Header value" />
															)}
														/>
														<Button
															type="button"
															size="small"
															variant="secondary"
															onClick={() => removeHeader(i)}
														>
															<Trash />
														</Button>
													</div>
												))}
												<Button
													type="button"
													size="small"
													variant="secondary"
													onClick={() => appendHeader({ key: '', value: '' })}
												>
													<Plus /> Add Header
												</Button>
											</div>
										</div>
									)}

									{/* Outgoing request config */}
									{actionType === 'outgoing_request' && (
										<div className="flex flex-col gap-y-4">
											<InlineTip label="Consider using a signed webhook">
												Outgoing requests are unsigned. Use{' '}
												<strong>Send Outgoing Webhook</strong> instead when the
												receiving endpoint supports HMAC-SHA256 signature verification.
											</InlineTip>
											<div className="flex flex-col gap-y-1">
												<Label htmlFor="req-url" size="small" weight="plus">
													Target URL *
												</Label>
												<Controller
													name="target_url"
													control={control}
													render={({ field }) => (
														<Input
															id="req-url"
															{...field}
															type="url"
															placeholder="https://example.com/api/endpoint"
														/>
													)}
												/>
											</div>
											<div className="flex flex-col gap-y-1">
												<Label size="small" weight="plus">
													Method
												</Label>
												<Controller
													name="request_method"
													control={control}
													render={({ field }) => (
														<Select
															value={field.value ?? 'POST'}
															onValueChange={field.onChange}
														>
															<Select.Trigger className="w-32">
																<Select.Value />
															</Select.Trigger>
															<Select.Content>
																<Select.Item value="GET">GET</Select.Item>
																<Select.Item value="POST">POST</Select.Item>
																<Select.Item value="PUT">PUT</Select.Item>
																<Select.Item value="DELETE">DELETE</Select.Item>
															</Select.Content>
														</Select>
													)}
												/>
												{!showBody && (
													<Text size="small" className="text-ui-fg-subtle">
														Field mappings will be sent as URL query parameters.
													</Text>
												)}
											</div>
											<div className="flex flex-col gap-y-2">
												<Text size="small" weight="plus" leading="compact">
													Custom Headers
												</Text>
												{headerFields.map((item, i) => (
													<div
														key={item.id}
														className="grid grid-cols-[1fr_1fr_auto] gap-2 items-center"
													>
														<Controller
															name={`target_headers.${i}.key`}
															control={control}
															render={({ field }) => (
																<Input {...field} placeholder="Header name" />
															)}
														/>
														<Controller
															name={`target_headers.${i}.value`}
															control={control}
															render={({ field }) => (
																<Input {...field} placeholder="Header value" />
															)}
														/>
														<Button
															type="button"
															size="small"
															variant="secondary"
															onClick={() => removeHeader(i)}
														>
															<Trash />
														</Button>
													</div>
												))}
												<Button
													type="button"
													size="small"
													variant="secondary"
													onClick={() => appendHeader({ key: '', value: '' })}
												>
													<Plus /> Add Header
												</Button>
											</div>
										</div>
									)}

									{/* Workflow picker */}
									{actionType === 'medusa_workflow' && (
										<div className="flex flex-col gap-y-3">
											<Controller
												name="medusa_workflow"
												control={control}
												render={({ field }) => (
													<Select
														value={field.value ?? ''}
														onValueChange={field.onChange}
													>
														<Select.Trigger>
															<Select.Value placeholder="Select workflow…" />
														</Select.Trigger>
														<Select.Content>
															{MEDUSA_WORKFLOW_CATEGORIES.map(cat => (
																<Select.Group key={cat}>
																	<Select.Label>{cat}</Select.Label>
																	{MEDUSA_WORKFLOWS.filter(
																		w => w.category === cat
																	).map(wf => (
																		<Select.Item key={wf.name} value={wf.name}>
																			{wf.label}
																		</Select.Item>
																	))}
																</Select.Group>
															))}
														</Select.Content>
													</Select>
												)}
											/>
											{workflowDef && (
												<div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-4">
													<Text
														size="small"
														weight="plus"
														leading="compact"
														className="text-ui-fg-subtle mb-2"
													>
														Expected input shape
													</Text>
													<pre className="font-mono text-xs text-ui-fg-subtle whitespace-pre-wrap">
														{renderWorkflowInputShape(workflowDef.inputFields)}
														{workflowDef.hasAdditionalData
															? '\nadditional_data?: { … }'
															: ''}
													</pre>
												</div>
											)}
										</div>
									)}
								</div>

								{/* ── Step 2: Query Augmentation (medusa_event only) ── */}
								{isMedusaEvent && actionReady && (
									<div className="flex flex-col gap-y-5">
										<StepHeader step={queryStepN} label="Augment Data with Query" />
										<Text size="small" className="text-ui-fg-subtle">
											Optionally fetch additional data from Medusa before mapping. The
											query result is merged into the available source fields under the
											entity name (e.g.{' '}
											<code className="font-mono text-xs">order.total</code>). Leave
											unconfigured to map only the raw event data.
										</Text>

										{/* Enable / clear toggle */}
										{queryConfig == null ? (
											<Button
												type="button"
												size="small"
												variant="secondary"
												onClick={() =>
													setValue('query', {
														entity_name: '',
														fields: [],
														filters_json: '',
														limit: 10
													})
												}
											>
												<Plus /> Configure Query
											</Button>
										) : (
											<div className="flex flex-col gap-y-4 rounded-lg border border-ui-border-base p-4">
												{/* Entity */}
												<div className="flex flex-col gap-y-1">
													<Label size="small" weight="plus">
														Entity
													</Label>
													<Controller
														name="query.entity_name"
														control={control}
														render={({ field, fieldState }) => (
															<>
																<Select
																	value={field.value ?? ''}
																	onValueChange={field.onChange}
																>
																	<Select.Trigger>
																		<Select.Value placeholder="Select entity…" />
																	</Select.Trigger>
																	<Select.Content>
																		{MEDUSA_ENTITIES.map(e => (
																			<Select.Item key={e.name} value={e.name}>
																				{e.label}
																			</Select.Item>
																		))}
																	</Select.Content>
																</Select>
																{fieldState.error && (
																	<Text size="small" className="text-ui-fg-error">
																		{fieldState.error.message}
																	</Text>
																)}
															</>
														)}
													/>
												</div>

												{/* Fields */}
												<div className="flex flex-col gap-y-1">
													<Label size="small" weight="plus">
														Fields
													</Label>
													<Text size="small" className="text-ui-fg-subtle">
														Which fields to retrieve. Use dot notation and{' '}
														<code className="font-mono text-xs">*</code> wildcards
														(e.g.{' '}
														<code className="font-mono text-xs">customer.*</code>).
													</Text>
													<Controller
														name="query.fields"
														control={control}
														render={({ field }) => (
															<FieldsEditor
																value={field.value ?? []}
																onChange={field.onChange}
															/>
														)}
													/>
												</div>

												{/* Filters */}
												<div className="flex flex-col gap-y-1">
													<Label size="small" weight="plus">
														Filters{' '}
														<span className="text-ui-fg-subtle font-normal">
															(JSON, optional)
														</span>
													</Label>
													<Text size="small" className="text-ui-fg-subtle">
														Use{' '}
														<code className="font-mono text-xs">
															"$event.fieldName"
														</code>{' '}
														to reference event data (e.g.{' '}
														<code className="font-mono text-xs">
															{'{ "id": "$event.id" }'}
														</code>
														). Supports operators:{' '}
														<code className="font-mono text-xs">
															$eq $in $gt $lt $ne $like
														</code>
														.
													</Text>
													<Controller
														name="query.filters_json"
														control={control}
														render={({ field }) => (
															<Textarea
																{...field}
																value={field.value ?? ''}
																placeholder={'{ "id": "$event.id" }'}
																rows={3}
																className="font-mono text-xs"
															/>
														)}
													/>
												</div>

												{/* Limit */}
												<div className="flex flex-col gap-y-1">
													<Label htmlFor="query-limit" size="small" weight="plus">
														Limit{' '}
														<span className="text-ui-fg-subtle font-normal">
															(1–100)
														</span>
													</Label>
													<Controller
														name="query.limit"
														control={control}
														render={({ field }) => (
															<Input
																id="query-limit"
																type="number"
																min={1}
																max={100}
																{...field}
																value={field.value ?? 10}
																onChange={e =>
																	field.onChange(Number(e.target.value))
																}
																className="w-32"
															/>
														)}
													/>
												</div>

												<Button
													type="button"
													size="small"
													variant="secondary"
													onClick={() => setValue('query', null)}
												>
													<Trash /> Remove Query
												</Button>
											</div>
										)}
									</div>
								)}

								{/* ── Step 3 (or 2): Mapping ────────────────────────── */}
								{showMapping && (
									<div className="flex flex-col gap-y-5">
										<StepHeader step={mappingStepN} label="Mapping" />
										<Text size="small" className="text-ui-fg-subtle">
											{actionType === 'outgoing_webhook' &&
												triggerType === 'medusa_event' &&
												'Map event (and query result) fields to the outgoing JSON body. Leave empty to forward the raw payload unchanged.'}
											{actionType === 'outgoing_webhook' &&
												triggerType === 'incoming_webhook' &&
												'Map incoming fields to the outgoing JSON body. Use dot notation for nested paths.'}
											{actionType === 'outgoing_request' &&
												!showBody &&
												'Map fields to query parameter keys. Values will be serialized to strings.'}
											{actionType === 'outgoing_request' &&
												showBody &&
												triggerType === 'medusa_event' &&
												'Map event (and query result) fields to the JSON request body.'}
											{actionType === 'outgoing_request' &&
												showBody &&
												triggerType === 'incoming_webhook' &&
												'Map incoming fields to the JSON request body.'}
											{actionType === 'medusa_workflow' &&
												triggerType === 'medusa_event' &&
												'Map event (and query result) fields to the workflow input. Unmapped fields are discarded.'}
											{actionType === 'medusa_workflow' &&
												triggerType === 'incoming_webhook' &&
												'Map incoming fields to the workflow input. Use dot notation for nested paths.'}
										</Text>
										<Controller
											name="field_mappings"
											control={control}
											render={({ field }) => (
												<FieldMappingEditor
													triggerType={triggerType}
													triggerEvents={triggerEvents}
													actionType={actionType}
													requestMethod={requestMethod}
													medusaWorkflow={medusaWorkflow}
													queryConfig={queryConfig}
													value={field.value ?? []}
													onChange={field.onChange}
												/>
											)}
										/>
									</div>
								)}

								{/* ── Step 4 (or 3): Static Values ──────────────────── */}
								{actionReady && (
									<div className="flex flex-col gap-y-5">
										<StepHeader step={staticStepN} label="Static Values" />
										<Text size="small" className="text-ui-fg-subtle">
											Add fixed key/value pairs always merged into the{' '}
											{actionType === 'medusa_workflow'
												? 'workflow input'
												: actionType === 'outgoing_request' && !showBody
													? 'query parameters'
													: 'outgoing payload'}
											. These are sent with every delivery regardless of the trigger
											data.
										</Text>
										<Controller
											name="static_values"
											control={control}
											render={({ field }) => (
												<StaticValuesEditor
													value={field.value ?? []}
													onChange={field.onChange}
												/>
											)}
										/>
									</div>
								)}
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
								Create Action
							</Button>
						</FocusModal.Footer>
					</form>
				</FormProvider>
			</FocusModal.Content>
		</FocusModal>
	)
}
