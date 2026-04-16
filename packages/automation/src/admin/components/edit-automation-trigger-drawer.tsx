import * as zod from 'zod'
import {
	Badge,
	Button,
	Drawer,
	Heading,
	Input,
	Label,
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

	const form = useForm<FormData>({
		resolver: zodResolver(schema),
		defaultValues: {
			name: trigger.name,
			description: trigger.description ?? '',
			is_active: trigger.is_active,
			trigger_events: trigger.trigger_events ?? [],
			trigger_signing_key: '',
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
				log_incoming: trigger.log_incoming ?? false
			})
		}
	}, [open, trigger, reset])

	const onSubmit = form.handleSubmit(data => {
		if (!data.trigger_signing_key) delete data.trigger_signing_key
		if (triggerType !== 'medusa_event') delete data.trigger_events
		if (triggerType !== 'incoming_webhook') delete data.trigger_signing_key
		updateTrigger(data, {
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
					<form onSubmit={onSubmit} className="flex flex-col h-full">
						<Drawer.Header>
							<Heading level="h2">Edit Trigger</Heading>
						</Drawer.Header>
						<Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto p-6">
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
								</div>
							)}
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
