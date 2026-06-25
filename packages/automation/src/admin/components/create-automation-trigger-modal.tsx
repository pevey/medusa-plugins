import * as zod from 'zod'
import {
	Badge,
	Button,
	FocusModal,
	Heading,
	Input,
	Label,
	RadioGroup,
	Select,
	Switch,
	Text,
	Textarea,
	toast
} from '@medusajs/ui'
import { useEffect } from 'react'
import { Controller, FormProvider, useForm, useWatch } from 'react-hook-form'
import { useBlocker } from 'react-router-dom'
import { MEDUSA_EVENTS, MEDUSA_EVENT_CATEGORIES } from '../lib/medusa-events'
import { TriggerType } from '../types'
import { useCreateAutomationTrigger } from '../hooks/automations'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	description: zod.string().optional(),
	is_active: zod.boolean().optional(),
	trigger_type: zod.enum(['medusa_event', 'incoming_webhook'] satisfies [TriggerType, ...TriggerType[]]),
	trigger_events: zod.array(zod.string()).optional(),
	trigger_signing_key: zod.string().optional(),
	signature_config: zod.object({
		header: zod.string().optional(),
		encoding: zod.enum(['hex', 'base64']).optional(),
		prefix: zod.string().optional(),
		template: zod.string().optional(),
		timestamp_header: zod.string().optional(),
		tolerance_seconds: zod.string().optional() // form gives string; converted in onSubmit
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
		<div className="flex flex-col">
			{MEDUSA_EVENT_CATEGORIES.map(cat => (
				<span key={cat}>
					{/* <Text size="small" weight="plus" leading="compact" className="text-ui-fg-subtle">
						{cat}
					</Text> */}
					{MEDUSA_EVENTS.filter(e => e.category === cat).map(ev => (
						<button
							key={ev.name}
							type="button"
							onClick={() => toggle(ev.name)}
							className="cursor-pointer m-1"
						>
							<Badge size="xsmall" color={value.includes(ev.name) ? 'orange' : 'grey'}>
								{ev.label}
							</Badge>
						</button>
					))}
				</span>
			))}
		</div>
	)
}

// ─── Main Form ────────────────────────────────────────────────────────────────

type Props = { open: boolean; setOpen: (open: boolean) => void }

export const CreateAutomationTriggerModal = ({ open, setOpen }: Props) => {
	const { mutate: createTrigger, isPending } = useCreateAutomationTrigger()

	const form = useForm<FormData>({
		defaultValues: {
			name: '',
			description: '',
			is_active: true,
			trigger_type: 'medusa_event',
			trigger_events: [],
			trigger_signing_key: '',
			signature_config: {
				header: '',
				encoding: 'hex',
				prefix: '',
				template: '',
				timestamp_header: '',
				tolerance_seconds: ''
			},
			log_incoming: false
		}
	})

	const {
		formState: { isDirty },
		reset,
		control
	} = form
	const triggerType = useWatch({ control, name: 'trigger_type' }) as TriggerType

	useEffect(() => {
		if (!open) reset()
	}, [open, reset])

	useBlocker(() => {
		if (isDirty && open) return !window.confirm('You have unsaved changes. Leave anyway?')
		return false
	})

	const onSubmit = form.handleSubmit(data => {
		const payload: any = { ...data }
		if (payload.trigger_type === 'medusa_event') {
			delete payload.trigger_signing_key
			delete payload.signature_config
		} else {
			delete payload.trigger_events
			// Compact signature_config: drop empty strings, coerce numbers, omit entirely if nothing set.
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
			if (Object.keys(compact).length > 0) {
				payload.signature_config = compact
			} else {
				delete payload.signature_config
			}
		}
		createTrigger(payload, {
			onSuccess: () => {
				toast.success('Automation trigger created')
				setOpen(false)
			},
			onError: () => toast.error('Failed to create automation trigger')
		})
	})

	return (
		<FocusModal open={open} onOpenChange={setOpen}>
			<FocusModal.Content>
				<FormProvider {...form}>
					<form onSubmit={onSubmit} className="flex flex-col h-full">
						<FocusModal.Header></FocusModal.Header>
						<FocusModal.Body className="flex flex-1 flex-col items-center overflow-y-auto">
							<div className="flex w-full max-w-[720px] flex-col gap-y-10 py-16 pb-8">
								<div className="flex flex-col gap-y-4">
									<Heading level="h1">Create Trigger</Heading>
									<div className="flex flex-col gap-y-1">
										<Label htmlFor="wt-name" size="small" weight="plus">
											Name
										</Label>
										<Controller
											name="name"
											control={control}
											render={({ field, fieldState }) => (
												<>
													<Input
														id="wt-name"
														{...field}
														placeholder="My Webhook Trigger"
													/>
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
										<Label htmlFor="wt-desc" size="small" weight="plus">
											Description
										</Label>
										<Controller
											name="description"
											control={control}
											render={({ field }) => (
												<Textarea
													id="wt-desc"
													{...field}
													placeholder="Optional description…"
												/>
											)}
										/>
									</div>
									<div>
										<Text weight="plus" size="small" className="leading-compact mb-1">
											What initiates this webhook?
										</Text>
										<Controller
											name="trigger_type"
											control={control}
											render={({ field }) => (
												<RadioGroup value={field.value} onValueChange={field.onChange}>
													<label
														htmlFor="trig-event"
														className={`flex cursor-pointer items-start gap-x-3 rounded-lg border p-4 transition-colors ${field.value === 'medusa_event' ? 'border-ui-border-interactive bg-ui-bg-field' : 'border-ui-border-base bg-ui-bg-base'}`}
													>
														<RadioGroup.Item value="medusa_event" id="trig-event" />
														<div>
															<Label htmlFor="trig-event" size="small" weight="plus">
																Medusa Event
															</Label>
															<Text size="small" className="text-ui-fg-subtle">
																One or more Medusa events fire (order placed,
																customer created, etc.)
															</Text>
														</div>
													</label>
													<label
														htmlFor="trig-webhook"
														className={`flex cursor-pointer items-start gap-x-3 rounded-lg border p-4 transition-colors ${field.value === 'incoming_webhook' ? 'border-ui-border-interactive bg-ui-bg-field' : 'border-ui-border-base bg-ui-bg-base'}`}
													>
														<RadioGroup.Item
															value="incoming_webhook"
															id="trig-webhook"
														/>
														<div>
															<Label
																htmlFor="trig-webhook"
																size="small"
																weight="plus"
															>
																Incoming Webhook
															</Label>
															<Text size="small" className="text-ui-fg-subtle">
																An external service POSTs data to a Medusa endpoint.
															</Text>
														</div>
													</label>
												</RadioGroup>
											)}
										/>
									</div>

									{triggerType === 'medusa_event' && (
										<div className="flex flex-col gap-y-2">
											<Text size="small" weight="plus" leading="compact">
												Select Events
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

									{triggerType === 'incoming_webhook' && (
										<div className="flex flex-col gap-y-3 rounded-lg border border-ui-border-base p-4">
											<Text size="small" weight="plus" leading="compact">
												Webhook URL
											</Text>
											<Text size="small" className="text-ui-fg-subtle">
												After saving, external services should POST to:
											</Text>
											<code className="font-mono text-xs bg-ui-bg-subtle rounded px-2 py-1 text-ui-fg-subtle">
												{window.location.origin}/webhooks/{'<trigger-id>'}
											</code>
											<div className="flex flex-col gap-y-1 mt-2">
												<Label htmlFor="wt-signing-key" size="small" weight="plus">
													Signing Key{' '}
													<span className="text-ui-fg-subtle font-normal">
														(optional)
													</span>
												</Label>
												<Text size="small" className="text-ui-fg-subtle">
													If set, incoming requests must include a matching HMAC-SHA256
													signature in the{' '}
													<code className="font-mono text-xs">
														x-webhook-signature
													</code>{' '}
													header.
												</Text>
												<Controller
													name="trigger_signing_key"
													control={control}
													render={({ field }) => (
														<Input
															id="wt-signing-key"
															{...field}
															type="password"
															placeholder="my-secret-key"
														/>
													)}
												/>
											</div>
											<div className="flex items-center justify-between mt-2">
												<div>
													<Label htmlFor="wt-log-incoming" size="small" weight="plus">
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
															id="wt-log-incoming"
															checked={field.value ?? false}
															onCheckedChange={field.onChange}
														/>
													)}
												/>
											</div>

											<details className="mt-2">
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
														<Label htmlFor="wt-sig-header" size="small" weight="plus">
															Signature Header
														</Label>
														<Text size="xsmall" className="text-ui-fg-subtle">
															Default: <code className="font-mono">x-webhook-signature</code>.
															Override for senders like GitHub (<code className="font-mono">X-Hub-Signature-256</code>) or Slack.
														</Text>
														<Controller
															name="signature_config.header"
															control={control}
															render={({ field }) => (
																<Input id="wt-sig-header" {...field} placeholder="x-webhook-signature" />
															)}
														/>
													</div>
													<div>
														<Label htmlFor="wt-sig-encoding" size="small" weight="plus">
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
																	<Select.Trigger id="wt-sig-encoding">
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
														<Label htmlFor="wt-sig-prefix" size="small" weight="plus">
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
																<Input id="wt-sig-prefix" {...field} placeholder="(none)" />
															)}
														/>
													</div>
													<div>
														<Label htmlFor="wt-sig-template" size="small" weight="plus">
															Signed Input Template
														</Label>
														<Text size="xsmall" className="text-ui-fg-subtle">
															Supports <code className="font-mono">{'{body}'}</code> and{' '}
															<code className="font-mono">{'{ts}'}</code>. Default:{' '}
															<code className="font-mono">{'{body}'}</code>. Slack-style:{' '}
															<code className="font-mono">{'v0:{ts}:{body}'}</code>.
														</Text>
														<Controller
															name="signature_config.template"
															control={control}
															render={({ field }) => (
																<Input id="wt-sig-template" {...field} placeholder="{body}" />
															)}
														/>
													</div>
													<div>
														<Label htmlFor="wt-sig-ts-header" size="small" weight="plus">
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
																<Input id="wt-sig-ts-header" {...field} placeholder="X-Slack-Request-Timestamp" />
															)}
														/>
													</div>
													<div>
														<Label htmlFor="wt-sig-tolerance" size="small" weight="plus">
															Replay Tolerance (seconds)
														</Label>
														<Text size="xsmall" className="text-ui-fg-subtle">
															Reject requests whose timestamp is outside this window. 0 or blank disables the check.
														</Text>
														<Controller
															name="signature_config.tolerance_seconds"
															control={control}
															render={({ field }) => (
																<Input id="wt-sig-tolerance" {...field} placeholder="300" inputMode="numeric" />
															)}
														/>
													</div>
												</div>
											</details>
										</div>
									)}
								</div>
							</div>
						</FocusModal.Body>
						<FocusModal.Footer className="flex w-full items-end justify-end gap-x-2">
							<Button
								className="ml-auto"
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
				</FormProvider>
			</FocusModal.Content>
		</FocusModal>
	)
}
