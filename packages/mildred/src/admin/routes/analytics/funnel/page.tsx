import { Container, Heading, Button, Text, Select, Switch, Input, Label, InlineTip, toast } from '@medusajs/ui'
import { Plus, Trash, ArrowUpMini, ArrowDownMini } from '@medusajs/icons'
import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useRubrics, useFunnels, useCreateFunnel, useUpdateFunnel } from '../../../hooks/analytics'
import type { AdminFunnel } from '../../../types/analytics'

export const handle = { breadcrumb: () => 'Funnel Configuration' }

const BACKEND_RUBRIC_NAMES = [
	'cart_created', 'cart_updated', 'order_placed', 'order_canceled', 'order_completed',
	'shipment_created', 'customer_created', 'customer_updated', 'return_requested', 'return_received'
]

const toLabel = (name: string) =>
	name.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())

const SYSTEM_RUBRICS = BACKEND_RUBRIC_NAMES.map((name) => ({ name, label: toLabel(name) }))

const FunnelConfigPage = () => {
	const [selectedFunnelId, setSelectedFunnelId] = useState<string | null>(null)
	const [steps, setSteps] = useState<string[]>([])
	const [name, setName] = useState('')
	const [label, setLabel] = useState('')
	const [isDefault, setIsDefault] = useState(false)
	const [isNew, setIsNew] = useState(false)

	const { data: rubricsData } = useRubrics({ limit: 100, active: true })
	const { data: funnelsData, isLoading: funnelsLoading } = useFunnels({ limit: 50 })

	const createFunnel = useCreateFunnel()
	const updateFunnel = useUpdateFunnel(selectedFunnelId || '')

	const customRubrics = rubricsData?.rubrics || []
	const funnels = funnelsData?.funnels || []

	// Merge system rubrics with custom DB rubrics, deduplicating by name
	const customNames = new Set(customRubrics.map((r) => r.name))
	const allRubrics = [
		...SYSTEM_RUBRICS.filter((r) => !customNames.has(r.name)),
		...customRubrics
	]

	const hasCustomRubrics = customRubrics.some((r) => !BACKEND_RUBRIC_NAMES.includes(r.name))

	useEffect(() => {
		if (funnels.length > 0 && !selectedFunnelId && !isNew) {
			const defaultFunnel = funnels.find((f) => f.is_default) || funnels[0]
			loadFunnel(defaultFunnel)
		}
	}, [funnels])

	const loadFunnel = (funnel: AdminFunnel) => {
		setSelectedFunnelId(funnel.id)
		setSteps(funnel.steps)
		setName(funnel.name)
		setLabel(funnel.label)
		setIsDefault(funnel.is_default)
		setIsNew(false)
	}

	const startNew = () => {
		setSelectedFunnelId(null)
		setSteps([])
		setName('')
		setLabel('')
		setIsDefault(false)
		setIsNew(true)
	}

	const handleSave = () => {
		const body = { name, label, steps, is_default: isDefault }
		const mutation = selectedFunnelId ? updateFunnel : createFunnel
		mutation.mutate(body, {
			onSuccess: () => {
				toast.success(selectedFunnelId ? 'Funnel updated' : 'Funnel created')
			},
			onError: (error: any) => {
				toast.error(error.message || 'Failed to save funnel')
			}
		})
	}

	const addStep = () => setSteps([...steps, ''])
	const removeStep = (i: number) => setSteps(steps.filter((_, idx) => idx !== i))
	const updateStep = (i: number, value: string) => setSteps(steps.map((s, idx) => idx === i ? value : s))
	const moveStep = (i: number, dir: -1 | 1) => {
		const newSteps = [...steps]
		const target = i + dir
		if (target < 0 || target >= newSteps.length) return
		;[newSteps[i], newSteps[target]] = [newSteps[target], newSteps[i]]
		setSteps(newSteps)
	}

	const isPending = createFunnel.isPending || updateFunnel.isPending

	if (funnelsLoading) {
		return (
			<div className="flex items-center justify-center py-12">
				<Text size="small" leading="compact" className="text-ui-fg-subtle">Loading...</Text>
			</div>
		)
	}

	return (
		<div className="flex flex-col gap-y-3">
			<Container>
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h1">Funnel Configuration</Heading>
					<div className="flex items-center gap-x-2">
						{funnels.length > 0 && (
							<Select size="small" value={selectedFunnelId || ''} onValueChange={(val) => {
								const f = funnels.find((fn) => fn.id === val)
								if (f) loadFunnel(f)
							}}>
								<Select.Trigger>
									<Select.Value placeholder="Select funnel" />
								</Select.Trigger>
								<Select.Content>
									{funnels.map((f) => (
										<Select.Item key={f.id} value={f.id}>{f.label}</Select.Item>
									))}
								</Select.Content>
							</Select>
						)}
						<Button size="small" variant="secondary" onClick={startNew}>New Funnel</Button>
					</div>
				</div>

				<div className="flex flex-col gap-y-4 px-6 pb-6 max-w-lg">
					<div className="flex flex-col gap-y-2">
						<Label>Name</Label>
						<Input placeholder="main_funnel" value={name} onChange={(e) => setName(e.target.value)} />
					</div>
					<div className="flex flex-col gap-y-2">
						<Label>Label</Label>
						<Input placeholder="Main Conversion Funnel" value={label} onChange={(e) => setLabel(e.target.value)} />
					</div>
					<div className="flex items-center gap-x-2">
						<Switch checked={isDefault} onCheckedChange={setIsDefault} />
						<Label>Set as default</Label>
					</div>

					<div className="flex flex-col gap-y-2">
						<Label>Steps</Label>
						{steps.map((step, i) => (
							<div key={i} className="flex items-center gap-x-2">
								<Text size="small" leading="compact" className="text-ui-fg-subtle w-6">{i + 1}.</Text>
								<Select size="small" value={step} onValueChange={(val) => updateStep(i, val)}>
									<Select.Trigger className="flex-1">
										<Select.Value placeholder="Select event" />
									</Select.Trigger>
									<Select.Content>
										{allRubrics.map((r) => (
											<Select.Item key={r.name} value={r.name}>{r.label} ({r.name})</Select.Item>
										))}
									</Select.Content>
								</Select>
								<Button size="small" variant="transparent" onClick={() => moveStep(i, -1)} disabled={i === 0}>
									<ArrowUpMini />
								</Button>
								<Button size="small" variant="transparent" onClick={() => moveStep(i, 1)} disabled={i === steps.length - 1}>
									<ArrowDownMini />
								</Button>
								<Button size="small" variant="transparent" onClick={() => removeStep(i)}>
									<Trash />
								</Button>
							</div>
						))}
						<Button size="small" variant="secondary" onClick={addStep}>
							<Plus /> Add Step
						</Button>
					</div>

					{!hasCustomRubrics && (
						<InlineTip variant="info">
							Only backend events are available. To track custom storefront events (like page views),{' '}
							<Link to="/analytics/rubrics" className="text-ui-fg-interactive underline">create a custom event rubric</Link>.
						</InlineTip>
					)}

					<Button
						onClick={handleSave}
						isLoading={isPending}
						disabled={!name || !label || steps.length === 0 || steps.some((s) => !s)}
					>
						{selectedFunnelId ? 'Update Funnel' : 'Create Funnel'}
					</Button>
				</div>
			</Container>
		</div>
	)
}

export default FunnelConfigPage
