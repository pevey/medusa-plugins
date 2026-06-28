import * as zod from 'zod'
import {
	Badge,
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
import { useEffect } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { MEDUSA_EVENTS, MEDUSA_EVENT_CATEGORIES } from '../lib/medusa-events'
import { AutomationTrigger } from '../types'
import { useUpdateAutomationTrigger } from '../hooks/automations'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	description: zod.string().optional(),
	is_active: zod.boolean().optional(),
	trigger_events: zod.array(zod.string()).optional(),
	trigger_signing_key: zod.string().optional(),
	signature_config: zod.object({
		header: zod.string().optional(),
		encoding: zod.enum(['hex', 'base64']).optional(),
		prefix: zod.string().optional(),
		template: zod.string().optional(),
		timestamp_header: zod.string().optional(),
		tolerance_seconds: zod.string().optional()
	}).optional(),
	log_incoming: zod.boolean().optional()
})

type FormData = zod.infer<typeof schema>

// ─── EventMultiSelect ─────────────────────────────────────────────────────────

const EventMultiSelect = ({
	value,
	onChange
}: {
	value: string[]
	onChange: (v: string[]) => void
}) => {
	const toggle = (name: string) =>
		onChange(value.includes(name) ? value.filter(e => e !== name) : [...value, name])
	return (
		<div className="flex flex-col gap-3 overflow-y-auto">
			{MEDUSA_EVENT_CATEGORIES.map(cat => (
				<div key={cat}>
					<Text
						size="small"
						weight="plus"
						leading="compact"
						className="text-ui-fg-subtle mb-1"
					>
						{cat}
					</Text>
					<div className="flex flex-wrap gap-1">
						{MEDUSA_EVENTS.filter(e => e.category === cat).map(ev => (
							<button
								key={ev.name}
								type="button"
								onClick={() => toggle(ev.name)}
								className="cursor-pointer"
							>
								<Badge size="xsmall" color={value.includes(ev.name) ? 'orange' : 'grey'}>
									{ev.label}
								</Badge>
							</button>
						))}
					</div>
				</div>
			))}
		</div>
	)
}

// ─── Read-only card (mirrors selected radio card styling) ─────────────────────

const ReadOnlyCard = ({ label, description }: { label: string; description: string }) => (
	<div className="flex items-start gap-x-3 rounded-lg border border-ui-border-interactive bg-ui-bg-field p-4">
		<div className="w-4 h-4 mt-0.5 rounded-full border-2 border-ui-border-interactive bg-ui-bg-base shrink-0 flex items-center justify-center">
			<div className="w-1.5 h-1.5 rounded-full bg-ui-border-interactive" />
		</div>
		<div>
			<Text size="small" weight="plus" leading="compact">
				{label}
			</Text>
			<Text size="small" className="text-ui-fg-subtle">
				{description}
			</Text>
		</div>
	</div>
)

const SectionDivider = () => <div className="h-px bg-ui-border-base -mx-6" />

// ─── Types ────────────────────────────────────────────────────────────────────

type Props = {
	trigger: AutomationTrigger
	open: boolean
	setOpen: (open: boolean) => void
}

// ─── Main Drawer ──────────────────────────────────────────────────────────────

export const EditAutomationTriggerDrawer = ({ trigger, open, setOpen }: Props) => {
	const { mutate: updateTrigger, isPending } = useUpdateAutomationTrigger(trigger.id)

	const scToForm = (sc: AutomationTrigger['signature_config']) => ({
		header: sc?.header ?? '',
		encoding: sc?.encoding ?? 'hex',
		prefix: sc?.prefix ?? '',
		template: sc?.template ?? '',
		timestamp_header: sc?.timestamp_header ?? '',
		tolerance_seconds: sc?.tolerance_seconds != null ? String(sc.tolerance_seconds) : ''
	})

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: trigger.name,
			description: trigger.description ?? '',
			is_active: trigger.is_active,
			trigger_events: trigger.trigger_events ?? [],
			trigger_signing_key: '',
			signature_config: scToForm(trigger.signature_config),
			log_incoming: trigger.log_incoming ?? false
		}
	})

	const {
		formState: { isDirty },
		reset,
		control
	} = form
	const triggerType = trigger.trigger_type
	const triggerEvents = useWatch({ control, name: 'trigger_events' }) ?? []

	useEffect(() => {
		if (open) {
			reset({
				name: trigger.name,
				description: trigger.description ?? '',
				is_active: trigger.is_active,
				trigger_events: trigger.trigger_events ?? [],
				trigger_signing_key: '',
				signature_config: scToForm(trigger.signature_config),
				log_incoming: trigger.log_incoming ?? false
			})
		}
	}, [open, trigger, reset])

	const onSubmit = form.handleSubmit(data => {
		const payload: any = { ...data }
		if (!payload.trigger_signing_key) delete payload.trigger_signing_key
		if (triggerType === 'medusa_event') {
			delete payload.signature_config
		} else {
			delete payload.trigger_events
			const sc = payload.signature_config ?? {}
			const compact: Record<string, unknown> = {}
			if (sc.header?.trim()) compact.header = sc.header.trim()
			if (sc.encoding && sc.encoding !== 'hex') compact.encoding = sc.encoding
			if (sc.prefix) compact.prefix = sc.prefix
			if (sc.template?.trim()) compact.template = sc.template.trim()
			if (sc.timestamp_header?.trim()) compact.timestamp_header = sc.timestamp_header.trim()
			if (sc.tolerance_seconds?.trim()) {
				const n = parseInt(sc.tolerance_seconds, 10)
				if (Number.isFinite(n) && n >= 0) compact.tolerance_seconds = n
			}
			// `null` clears the column server-side; omitted leaves it unchanged.
			payload.signature_config = Object.keys(compact).length > 0 ? compact : null
		}
		if (triggerType !== 'incoming_webhook') delete payload.trigger_signing_key
		updateTrigger(payload, {
			onSuccess: () => {
				toast.success('Trigger updated')
				setOpen(false)
			},
			onError: () => toast.error('Failed to update trigger')
		})
	})

	const showEvents = triggerType === 'medusa_event'
	const showIncoming = triggerType === 'incoming_webhook'

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<FormProvider {...form}>
					<form onSubmit={onSubmit} className="flex flex-1 flex-col overflow-hidden">
						<Drawer.Header>
							<Heading level="h1">Edit Trigger</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex max-w-full flex-1 flex-col gap-y-8 overflow-y-auto">
							{/* ── Read-only trigger type ────────────────────────── */}
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
							{/* ── Basic Info ───────────────────────────────────── */}
							<div>
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
							<div>
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
										Enable or disable this trigger.
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

							{/* ── Medusa Event config ──────────────────────────── */}
							{showEvents && (
								<div className="flex flex-col gap-y-2">
									<Text size="small" weight="plus" leading="compact">
										Trigger Events
										{triggerEvents.length > 0 && (
											<span className="text-ui-fg-subtle font-normal ml-1">
												({triggerEvents.length} selected)
											</span>
										)}
									</Text>
									<Controller
										name="trigger_events"
										control={control}
										render={({ field }) => (
											<EventMultiSelect
												value={field.value ?? []}
												onChange={field.onChange}
											/>
										)}
									/>
								</div>
							)}

							{/* ── Incoming Webhook config ──────────────────────── */}
							{showIncoming && (
								<div className="flex flex-col gap-y-3 rounded-lg border border-ui-border-base p-4">
									<Text size="small" weight="plus" leading="compact">
										Webhook URL
									</Text>
									<Text size="small" className="text-ui-fg-subtle">
										External services should POST to:
									</Text>
									<code className="font-mono text-xs bg-ui-bg-subtle rounded px-2 py-1 text-ui-fg-subtle">
										{window.location.origin}/webhooks/{trigger.id}
									</code>
									<div className="flex flex-col gap-y-1 mt-1">
										<Label htmlFor="edit-signing-key" size="small" weight="plus">
											Signing Key{' '}
											<span className="text-ui-fg-subtle font-normal">(optional)</span>
										</Label>
										<Text size="small" className="text-ui-fg-subtle">
											Leave blank to keep the existing value. Enter a new value to rotate
											the key.
										</Text>
										<Controller
											name="trigger_signing_key"
											control={control}
											render={({ field }) => (
												<Input
													id="edit-signing-key"
													{...field}
													type="password"
													placeholder="Enter new key to rotate…"
												/>
											)}
										/>
									</div>
									<div className="flex items-center justify-between mt-2">
										<div>
											<Label htmlFor="edit-log-incoming" size="small" weight="plus">
												Log Incoming Payloads
											</Label>
											<Text size="small" className="text-ui-fg-subtle">
												Store a redacted copy of each incoming request for review.
											</Text>
										</div>
										<Controller
											name="log_incoming"
											control={control}
											render={({ field }) => (
												<Switch
													id="edit-log-incoming"
													checked={field.value ?? false}
													onCheckedChange={field.onChange}
												/>
											)}
										/>
									</div>

									<details className="mt-2" open={!!trigger.signature_config}>
										<summary className="cursor-pointer">
											<Text size="small" weight="plus" className="inline">
												Advanced signing options
											</Text>
											<Text size="xsmall" className="text-ui-fg-subtle inline ml-2">
												(only needed for non-default senders)
											</Text>
										</summary>
										<div className="flex flex-col gap-y-3 mt-3 pl-2 border-l border-ui-border-base">
											<div>
												<Label htmlFor="edit-sig-header" size="small" weight="plus">
													Signature Header
												</Label>
												<Text size="xsmall" className="text-ui-fg-subtle">
													Default: <code className="font-mono">x-webhook-signature</code>.
												</Text>
												<Controller
													name="signature_config.header"
													control={control}
													render={({ field }) => (
														<Input id="edit-sig-header" {...field} placeholder="x-webhook-signature" />
													)}
												/>
											</div>
											<div>
												<Label htmlFor="edit-sig-encoding" size="small" weight="plus">
													Encoding
												</Label>
												<Text size="xsmall" className="text-ui-fg-subtle">
													How the signature bytes are encoded in the header. Default: hex.
												</Text>
												<Controller
													name="signature_config.encoding"
													control={control}
													render={({ field }) => (
														<Select value={field.value ?? 'hex'} onValueChange={field.onChange}>
															<Select.Trigger id="edit-sig-encoding">
																<Select.Value />
															</Select.Trigger>
															<Select.Content>
																<Select.Item value="hex">hex</Select.Item>
																<Select.Item value="base64">base64</Select.Item>
															</Select.Content>
														</Select>
													)}
												/>
											</div>
											<div>
												<Label htmlFor="edit-sig-prefix" size="small" weight="plus">
													Header Prefix
												</Label>
												<Text size="xsmall" className="text-ui-fg-subtle">
													Stripped from the header value before decoding. E.g.{' '}
													<code className="font-mono">sha256=</code> for GitHub.
												</Text>
												<Controller
													name="signature_config.prefix"
													control={control}
													render={({ field }) => (
														<Input id="edit-sig-prefix" {...field} placeholder="(none)" />
													)}
												/>
											</div>
											<div>
												<Label htmlFor="edit-sig-template" size="small" weight="plus">
													Signed Input Template
												</Label>
												<Text size="xsmall" className="text-ui-fg-subtle">
													Supports <code className="font-mono">{'{body}'}</code> and{' '}
													<code className="font-mono">{'{ts}'}</code>. Default:{' '}
													<code className="font-mono">{'{body}'}</code>.
												</Text>
												<Controller
													name="signature_config.template"
													control={control}
													render={({ field }) => (
														<Input id="edit-sig-template" {...field} placeholder="{body}" />
													)}
												/>
											</div>
											<div>
												<Label htmlFor="edit-sig-ts-header" size="small" weight="plus">
													Timestamp Header
												</Label>
												<Text size="xsmall" className="text-ui-fg-subtle">
													Header to read the timestamp from for{' '}
													<code className="font-mono">{'{ts}'}</code> substitution and replay checks.
												</Text>
												<Controller
													name="signature_config.timestamp_header"
													control={control}
													render={({ field }) => (
														<Input id="edit-sig-ts-header" {...field} placeholder="X-Slack-Request-Timestamp" />
													)}
												/>
											</div>
											<div>
												<Label htmlFor="edit-sig-tolerance" size="small" weight="plus">
													Replay Tolerance (seconds)
												</Label>
												<Text size="xsmall" className="text-ui-fg-subtle">
													Reject requests whose timestamp is outside this window. 0 or blank disables the check.
												</Text>
												<Controller
													name="signature_config.tolerance_seconds"
													control={control}
													render={({ field }) => (
														<Input id="edit-sig-tolerance" {...field} placeholder="300" inputMode="numeric" />
													)}
												/>
											</div>
										</div>
									</details>
								</div>
							)}
						</Drawer.Body>

						<Drawer.Footer>
							<div className="flex items-center justify-end gap-x-2">
								<Drawer.Close asChild>
									<Button size="small" variant="secondary" disabled={isPending}>
										Cancel
									</Button>
								</Drawer.Close>
								<Button
									type="submit"
									size="small"
									isLoading={isPending}
									disabled={!isDirty || isPending}
								>
									Save Changes
								</Button>
							</div>
						</Drawer.Footer>
					</form>
				</FormProvider>
			</Drawer.Content>
		</Drawer>
	)
}
