import { Button, Drawer, Heading, Input, Text, toast } from '@medusajs/ui'
import { Plus, Trash } from '@medusajs/icons'
import { useEffect, useState } from 'react'
import { useBlocker } from 'react-router-dom'
import { AdminFormField } from '../types'
import { useUpdateFormField } from '../hooks/forms'

type OptionInput = {
	_key: string
	id?: string
	label: string
	value: string
	sort_order: number
}

function toValue(label: string) {
	return label
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '')
}

type Props = {
	formId: string
	field: AdminFormField
	open: boolean
	setOpen: (open: boolean) => void
	onSaved: () => void
}

export const FormFieldOptionsModal = ({ formId, field, open, setOpen, onSaved }: Props) => {
	const { mutate, isPending } = useUpdateFormField(formId, field.id)
	const [options, setOptions] = useState<OptionInput[]>([])
	const [snapshot, setSnapshot] = useState<OptionInput[]>([])

	useEffect(() => {
		if (open) {
			const initial = [...(field.field_options ?? [])]
				.sort((a, b) => a.sort_order - b.sort_order)
				.map(o => ({
					_key: o.id,
					id: o.id,
					label: o.label,
					value: o.value,
					sort_order: o.sort_order
				}))
			setOptions(initial)
			setSnapshot(initial)
		}
	}, [open, field.id])

	const isDirty = JSON.stringify(options) !== JSON.stringify(snapshot)

	useBlocker(() => {
		if (open && isDirty) return !window.confirm('You have unsaved changes. Leave anyway?')
		return false
	})

	const add = () => {
		setOptions(prev => [
			...prev,
			{ _key: crypto.randomUUID(), label: '', value: '', sort_order: prev.length }
		])
	}

	const update = (key: string, patch: Partial<OptionInput>) => {
		setOptions(prev => prev.map(o => (o._key === key ? { ...o, ...patch } : o)))
	}

	const remove = (key: string) => {
		setOptions(prev => prev.filter(o => o._key !== key).map((o, i) => ({ ...o, sort_order: i })))
	}

	const handleSave = () => {
		mutate(
			{
				field_options: options.map(o => ({
					id: o.id,
					label: o.label,
					value: o.value,
					sort_order: o.sort_order
				}))
			},
			{
				onSuccess: () => {
					setOpen(false)
					toast.success('Options saved')
				},
				onError: () => toast.error('Failed to save options')
			}
		)
	}

	return (
		<Drawer open={open} onOpenChange={setOpen}>
			<Drawer.Content>
				<Drawer.Header>
					<Heading level="h2">
						Options — <span className="font-mono text-sm font-normal">{field.label}</span>
					</Heading>
				</Drawer.Header>
				<Drawer.Body className="flex flex-col gap-y-4 overflow-y-auto">
					{options.length > 0 && (
						<div className="grid grid-cols-[1fr_1fr_32px] gap-x-2 px-1">
							<Text size="xsmall" className="text-ui-fg-muted">
								Label
							</Text>
							<Text size="xsmall" className="text-ui-fg-muted">
								Value
							</Text>
							<span />
						</div>
					)}
					{options.map(opt => (
						<div
							key={opt._key}
							className="grid grid-cols-[1fr_1fr_32px] gap-x-2 items-center"
						>
							<Input
								size="small"
								value={opt.label}
								placeholder="Option label"
								onChange={e => {
									const label = e.target.value
									const wasAuto = opt.value === toValue(opt.label)
									update(opt._key, {
										label,
										value: wasAuto ? toValue(label) : opt.value
									})
								}}
							/>
							<Input
								size="small"
								value={opt.value}
								placeholder="option_value"
								className="font-mono"
								onChange={e =>
									update(opt._key, {
										value: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
									})
								}
							/>
							<Button
								type="button"
								variant="transparent"
								size="small"
								onClick={() => remove(opt._key)}
							>
								<Trash className="text-ui-fg-subtle" />
							</Button>
						</div>
					))}
					{options.length === 0 && (
						<Text size="small" className="text-ui-fg-subtle">
							No options yet. Add one below.
						</Text>
					)}
					<Button
						type="button"
						variant="secondary"
						size="small"
						className="w-fit"
						onClick={add}
					>
						<Plus className="mr-1" />
						Add Option
					</Button>
				</Drawer.Body>
				<Drawer.Footer className="flex justify-end gap-x-2">
					<Button
						variant="secondary"
						size="small"
						onClick={() => setOpen(false)}
						disabled={isPending}
					>
						Cancel
					</Button>
					<Button size="small" isLoading={isPending} disabled={isPending} onClick={handleSave}>
						Save
					</Button>
				</Drawer.Footer>
			</Drawer.Content>
		</Drawer>
	)
}
