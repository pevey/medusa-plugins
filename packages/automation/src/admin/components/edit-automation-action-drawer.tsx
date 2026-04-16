import * as zod from 'zod'
import {
	Button,
	Drawer,
	Heading,
	Input,
	Label,
	Select,
	Switch,
	Text,
	Textarea,
	toast
} from '@medusajs/ui'
import { Plus, Trash } from '@medusajs/icons'
import { useEffect } from 'react'
import { Controller, FormProvider, useFieldArray, useForm, useWatch } from 'react-hook-form'
import { useUpdateAutomationAction, useUpsertAutomationActionQuery, useDeleteAutomationActionQuery, useAutomationSecrets, useAutomationActionQuery } from '../hooks/automations'
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

// ─── Main Drawer ──────────────────────────────────────────────────────────────

type AutomationActionForEdit = {
	id: string
	name: string
	description?: string
	action_type: ActionType
	is_active: boolean
	target_url?: string
	signing_secret_id?: string | null
	request_method?: string | null
	target_headers?: Array<{ key: string; value: string }>
	medusa_workflow?: string
	field_mappings?: FieldMapping[]
	static_values?: StaticValue[]
}

type Props = {
	action: AutomationActionForEdit
	triggerId: string
	triggerType?: TriggerType
	triggerEvents?: string[]
	open: boolean
	setOpen: (open: boolean) => void
}

export const EditAutomationActionDrawer = ({
	action,
	triggerId,
	triggerType = 'medusa_event',
	triggerEvents = [],
	open,
	setOpen
}: Props) => {
	const isMedusaEvent = triggerType === 'medusa_event'
	const { mutateAsync: updateAction, isPending } = useUpdateAutomationAction(triggerId, action.id)
	const { mutateAsync: upsertQuery } = useUpsertAutomationActionQuery(triggerId, action.id)
	const { mutateAsync: deleteQuery } = useDeleteAutomationActionQuery(triggerId, action.id)

	const form = useForm<FormData>({
		defaultValues: {
			name: action.name,
			description: action.description ?? '',
			is_active: action.is_active,
			target_url: action.target_url ?? '',
			signing_secret_id: action.signing_secret_id ?? null,
			request_method: (action.request_method as RequestMethod) ?? 'POST',
			target_headers: action.target_headers ?? [],
			medusa_workflow: action.medusa_workflow ?? '',
			field_mappings: action.field_mappings ?? [],
			static_values: action.static_values ?? [],
			query: null
		}
	})

	const {
		formState: { isDirty },
		reset,
		control,
		setValue
	} = form
	const actionType = action.action_type
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

	// Fetch signing secrets when editing an outgoing webhook
	const { data: secretsData } = useAutomationSecrets(open && actionType === 'outgoing_webhook')
	const secrets = secretsData?.secrets ?? []

	// Fetch existing query config when the drawer is open
	const { data: existingQueryData } = useAutomationActionQuery(triggerId, action.id, open && !!action.id && isMedusaEvent)

	// Reset form when drawer opens with action data
	useEffect(() => {
		if (open) {
			reset({
				name: action.name,
				description: action.description ?? '',
				is_active: action.is_active,
				target_url: action.target_url ?? '',
				signing_secret_id: action.signing_secret_id ?? null,
				request_method: (action.request_method as RequestMethod) ?? 'POST',
				target_headers: action.target_headers ?? [],
				medusa_workflow: action.medusa_workflow ?? '',
				field_mappings: action.field_mappings ?? [],
				static_values: action.static_values ?? [],
				query: null
			})
		}
	}, [open, action, reset])

	// Populate query field once the query data has loaded (without marking dirty)
	useEffect(() => {
		if (open && existingQueryData !== undefined) {
			const q = existingQueryData.query
			if (q) {
				setValue(
					'query',
					{
						entity_name: q.entity_name,
						fields: q.fields ?? [],
						filters_json: q.filters ? JSON.stringify(q.filters, null, 2) : '',
						limit: q.limit ?? 10
					},
					{ shouldDirty: false }
				)
			}
		}
	}, [existingQueryData, open, setValue])

	const onSubmit = form.handleSubmit(async data => {
		const { query, ...actionData } = data
		const payload = { ...actionData }
		if (actionType !== 'outgoing_webhook') {
			delete payload.target_url
			delete payload.target_headers
		}
		if (actionType !== 'medusa_workflow') {
			delete payload.medusa_workflow
		}

		try {
			await updateAction(payload)

			if (isMedusaEvent) {
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
						entity_name: query.entity_name,
						fields: (query.fields ?? []).filter(Boolean),
						filters,
						limit: query.limit ?? 10
					})
				} else if (existingQueryData?.query) {
					// Query was removed — delete it
					await deleteQuery()
				}
			}

			toast.success('Action updated')
			setOpen(false)
		} catch {
			toast.error('Failed to update action')
		}
	})

	const showMapping =
		actionType === 'outgoing_webhook' ||
		actionType === 'outgoing_request' ||
		(actionType === 'medusa_workflow' && !!medusaWorkflow)

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={onSubmit} className="flex flex-col h-full">
						<Drawer.Header>
							<Heading level="h2">Edit Action</Heading>
						</Drawer.Header>

						<Drawer.Body className="flex flex-col gap-y-6 overflow-y-auto p-6">
							{/* ── Read-only action type ─────────────────────────── */}
							<div className="flex flex-col gap-y-3">
								<div>
									<Text size="small" weight="plus" leading="compact">
										Action Type
									</Text>
									<Text size="small" className="text-ui-fg-subtle mb-1">
										Cannot be changed after creation.
									</Text>
									<Input
										value={
											actionType === 'outgoing_webhook'
												? 'Outgoing Webhook'
												: actionType === 'outgoing_request'
													? 'Outgoing Request'
													: 'Medusa Workflow'
										}
										readOnly
									/>
								</div>
							</div>

							{/* ── Basic Info ───────────────────────────────────── */}
							<div className="flex flex-col gap-y-4">
								<div className="flex flex-col gap-y-1">
									<Label htmlFor="edit-name" size="small" weight="plus">
										Name *
									</Label>
									<Controller
										name="name"
										control={control}
										render={({ field, fieldState }) => (
											<>
												<Input id="edit-name" {...field} />
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
									<Label htmlFor="edit-description" size="small" weight="plus">
										Description
									</Label>
									<Controller
										name="description"
										control={control}
										render={({ field }) => <Textarea id="edit-description" {...field} />}
									/>
								</div>

								<div className="flex items-center justify-between">
									<div>
										<Text size="small" weight="plus" leading="compact">
											Active
										</Text>
										<Text size="small" className="text-ui-fg-subtle">
											Enable or disable this action.
										</Text>
									</div>
									<Controller
										name="is_active"
										control={control}
										render={({ field }) => (
											<Switch checked={field.value} onCheckedChange={field.onChange} />
										)}
									/>
								</div>
							</div>

							{/* ── Outgoing webhook config ──────────────────────── */}
							{actionType === 'outgoing_webhook' && (
								<div className="flex flex-col gap-y-4">
									<div className="flex flex-col gap-y-1">
										<Label htmlFor="edit-target-url" size="small" weight="plus">
											Target URL
										</Label>
										<Controller
											name="target_url"
											control={control}
											render={({ field }) => (
												<Input
													id="edit-target-url"
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
											Sign the outgoing payload with HMAC-SHA256. The signature is sent as{' '}
											<code className="font-mono text-xs">x-webhook-signature</code>.
										</Text>
										<Controller
											name="signing_secret_id"
											control={control}
											render={({ field }) => (
												<Select
													value={field.value ?? '__none__'}
													onValueChange={v =>
														field.onChange(v === '__none__' ? null : v)
													}
												>
													<Select.Trigger>
														<Select.Value placeholder="None (unsigned)" />
													</Select.Trigger>
													<Select.Content>
														<Select.Item value="__none__">None (unsigned)</Select.Item>
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

							{/* ── Outgoing request config ──────────────────────── */}
							{actionType === 'outgoing_request' && (
								<div className="flex flex-col gap-y-4">
									<div className="flex flex-col gap-y-1">
										<Label htmlFor="edit-req-url" size="small" weight="plus">
											Target URL
										</Label>
										<Controller
											name="target_url"
											control={control}
											render={({ field }) => (
												<Input
													id="edit-req-url"
													{...field}
													type="url"
													placeholder="https://example.com/api/endpoint"
												/>
											)}
										/>
									</div>
									<div className="flex flex-col gap-y-1">
										<Label size="small" weight="plus">Method</Label>
										<Controller
											name="request_method"
											control={control}
											render={({ field }) => (
												<Select value={field.value ?? 'POST'} onValueChange={field.onChange}>
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
										{(requestMethod === 'GET' || requestMethod === 'DELETE') && (
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

							{/* ── Workflow config ──────────────────────────────── */}
							{actionType === 'medusa_workflow' && (
								<div className="flex flex-col gap-y-3">
									<Label size="small" weight="plus">
										Medusa Workflow
									</Label>
									<Controller
										name="medusa_workflow"
										control={control}
										render={({ field }) => (
											<Select value={field.value ?? ''} onValueChange={field.onChange}>
												<Select.Trigger>
													<Select.Value placeholder="Select workflow…" />
												</Select.Trigger>
												<Select.Content>
													{MEDUSA_WORKFLOW_CATEGORIES.map(cat => (
														<Select.Group key={cat}>
															<Select.Label>{cat}</Select.Label>
															{MEDUSA_WORKFLOWS.filter(w => w.category === cat).map(wf => (
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
										<div className="rounded-lg border border-ui-border-base bg-ui-bg-subtle p-3">
											<Text
												size="small"
												weight="plus"
												leading="compact"
												className="text-ui-fg-subtle mb-1"
											>
												Expected input shape
											</Text>
											<pre className="font-mono text-xs text-ui-fg-subtle whitespace-pre-wrap">
												{renderWorkflowInputShape(workflowDef.inputFields)}
												{workflowDef.hasAdditionalData ? '\nadditional_data?: { … }' : ''}
											</pre>
										</div>
									)}
								</div>
							)}

							{/* ── Augment Data with Query (medusa_event only) ──── */}
							{isMedusaEvent && (
								<div className="flex flex-col gap-y-4">
									<div>
										<Text size="small" weight="plus" leading="compact">
											Augment Data with Query
										</Text>
										<Text size="small" className="text-ui-fg-subtle">
											Optionally fetch additional Medusa data before mapping. The query result
											is merged under the entity name (e.g.{' '}
											<code className="font-mono text-xs">order.total</code>).
										</Text>
									</div>

									{queryConfig == null ? (
										<Button
											type="button"
											size="small"
											variant="secondary"
											onClick={() =>
												setValue(
													'query',
													{ entity_name: '', fields: [], filters_json: '', limit: 10 },
													{ shouldDirty: true }
												)
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
													<code className="font-mono text-xs">*</code> wildcards (e.g.{' '}
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
													<span className="text-ui-fg-subtle font-normal">(JSON, optional)</span>
												</Label>
												<Text size="small" className="text-ui-fg-subtle">
													Use{' '}
													<code className="font-mono text-xs">"$event.fieldName"</code> to
													reference event data (e.g.{' '}
													<code className="font-mono text-xs">{'{ "id": "$event.id" }'}</code>
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
												<Label htmlFor="edit-query-limit" size="small" weight="plus">
													Limit{' '}
													<span className="text-ui-fg-subtle font-normal">(1–100)</span>
												</Label>
												<Controller
													name="query.limit"
													control={control}
													render={({ field }) => (
														<Input
															id="edit-query-limit"
															type="number"
															min={1}
															max={100}
															{...field}
															value={field.value ?? 10}
															onChange={e => field.onChange(Number(e.target.value))}
															className="w-32"
														/>
													)}
												/>
											</div>

											<Button
												type="button"
												size="small"
												variant="secondary"
												onClick={() => setValue('query', null, { shouldDirty: true })}
											>
												<Trash /> Remove Query
											</Button>
										</div>
									)}
								</div>
							)}

							{/* ── Field Mappings ───────────────────────────────── */}
							{showMapping && (
								<div className="flex flex-col gap-y-3">
									<div>
										<Text size="small" weight="plus" leading="compact">
											Field Mappings
										</Text>
										<Text size="small" className="text-ui-fg-subtle">
											{triggerType === 'medusa_event' &&
												actionType === 'outgoing_webhook' &&
												'Map event (and query result) fields to the outgoing JSON body.'}
											{triggerType === 'medusa_event' &&
												actionType === 'medusa_workflow' &&
												'Map event (and query result) fields to the workflow input.'}
											{triggerType === 'incoming_webhook' &&
												actionType === 'outgoing_webhook' &&
												'Map incoming fields to the outgoing JSON body.'}
											{triggerType === 'incoming_webhook' &&
												actionType === 'medusa_workflow' &&
												'Map incoming fields to the workflow input.'}
										</Text>
									</div>
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

							{/* ── Static Values ─────────────────────────────── */}
							<div className="flex flex-col gap-y-3">
								<div>
									<Text size="small" weight="plus" leading="compact">
										Static Values
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										Fixed key/value pairs always merged into the{' '}
										{actionType === 'outgoing_webhook'
											? 'outgoing payload'
											: 'workflow input'}
										. Sent with every delivery regardless of the trigger data.
									</Text>
								</div>
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
						</Drawer.Body>

						<Drawer.Footer>
							<Button
								type="button"
								variant="secondary"
								size="small"
								onClick={() => setOpen(false)}
								disabled={isPending}
							>
								Cancel
							</Button>
							<Button
								type="submit"
								size="small"
								isLoading={isPending}
								disabled={!isDirty || isPending}
							>
								Save Changes
							</Button>
						</Drawer.Footer>
					</form>
				</FormProvider>
			</Drawer.Content>
		</Drawer>
	)
}
