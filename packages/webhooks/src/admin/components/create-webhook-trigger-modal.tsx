import * as zod from 'zod'
import {
	Badge,
	Button,
	FocusModal,
	Heading,
	Input,
	Label,
	RadioGroup,
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
import { useCreateWebhookTrigger } from '../hooks/webhooks'

// ─── Schema ──────────────────────────────────────────────────────────────────

const schema = zod.object({
	name: zod.string().min(1, 'Required'),
	description: zod.string().optional(),
	is_active: zod.boolean().optional(),
	trigger_type: zod.enum(['medusa_event', 'incoming_webhook'] satisfies [TriggerType, ...TriggerType[]]),
	trigger_events: zod.array(zod.string()).optional(),
	trigger_signing_key: zod.string().optional(),
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

export const CreateWebhookTriggerModal = ({ open, setOpen }: Props) => {
	const { mutate: createTrigger, isPending } = useCreateWebhookTrigger()

	const form = useForm<FormData>({
		defaultValues: {
			name: '',
			description: '',
			is_active: true,
			trigger_type: 'medusa_event',
			trigger_events: [],
			trigger_signing_key: '',
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
		const payload = { ...data }
		if (payload.trigger_type === 'medusa_event') {
			delete payload.trigger_signing_key
		} else {
			delete payload.trigger_events
		}
		createTrigger(payload, {
			onSuccess: () => {
				toast.success('Webhook trigger created')
				setOpen(false)
			},
			onError: () => toast.error('Failed to create webhook trigger')
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
