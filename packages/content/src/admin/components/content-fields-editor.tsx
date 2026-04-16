import { Button, Input, Select, Switch, Text } from '@medusajs/ui'
import { Plus, Trash } from '@medusajs/icons'

export type FieldInput = {
	_key: string
	id?: string
	name: string
	label: string
	field_type: string
	required: boolean
	sort_order: number
}

const FIELD_TYPE_OPTIONS = [
	{ value: 'text', label: 'Text' },
	{ value: 'number', label: 'Number' },
	{ value: 'boolean', label: 'Boolean' },
	{ value: 'date', label: 'Date' },
	{ value: 'select', label: 'Select' },
	{ value: 'multiselect', label: 'Multi-select' },
	{ value: 'rich_text', label: 'Rich Text' },
	{ value: 'image', label: 'Image' }
]

function toFieldName(label: string) {
	return label
		.toLowerCase()
		.trim()
		.replace(/\s+/g, '_')
		.replace(/[^a-z0-9_]/g, '')
}

type Props = {
	fields: FieldInput[]
	onChange: (fields: FieldInput[]) => void
}

export const ContentFieldsEditor = ({ fields, onChange }: Props) => {
	const add = () => {
		onChange([
			...fields,
			{
				_key: crypto.randomUUID(),
				name: '',
				label: '',
				field_type: 'text',
				required: false,
				sort_order: fields.length
			}
		])
	}

	const update = (key: string, patch: Partial<FieldInput>) => {
		onChange(fields.map(f => (f._key === key ? { ...f, ...patch } : f)))
	}

	const remove = (key: string) => {
		onChange(
			fields.filter(f => f._key !== key).map((f, i) => ({ ...f, sort_order: i }))
		)
	}

	return (
		<div className="flex flex-col gap-y-2">
			{fields.length > 0 && (
				<div className="grid grid-cols-[1fr_1fr_140px_40px_32px] gap-x-2 px-1">
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
						Req
					</Text>
					<span />
				</div>
			)}
			{fields.map(field => (
				<div
					key={field._key}
					className="grid grid-cols-[1fr_1fr_140px_40px_32px] gap-x-2 items-center"
				>
					<Input
						size="small"
						value={field.label}
						placeholder="Label"
						onChange={e => {
							const label = e.target.value
							const wasAuto = field.name === toFieldName(field.label)
							update(field._key, {
								label,
								name: wasAuto ? toFieldName(label) : field.name
							})
						}}
					/>
					<Input
						size="small"
						value={field.name}
						placeholder="field_name"
						className="font-mono"
						onChange={e =>
							update(field._key, {
								name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '')
							})
						}
					/>
					<Select
						value={field.field_type}
						onValueChange={v => update(field._key, { field_type: v })}
					>
						<Select.Trigger>
							<Select.Value />
						</Select.Trigger>
						<Select.Content>
							{FIELD_TYPE_OPTIONS.map(opt => (
								<Select.Item key={opt.value} value={opt.value}>
									{opt.label}
								</Select.Item>
							))}
						</Select.Content>
					</Select>
					<div className="flex justify-center">
						<Switch
							checked={field.required}
							onCheckedChange={v => update(field._key, { required: v })}
						/>
					</div>
					<Button
						type="button"
						variant="transparent"
						size="small"
						onClick={() => remove(field._key)}
					>
						<Trash className="text-ui-fg-subtle" />
					</Button>
				</div>
			))}
			<Button
				type="button"
				variant="secondary"
				size="small"
				className="mt-1 w-fit"
				onClick={add}
			>
				<Plus className="mr-1" />
				Add Field
			</Button>
		</div>
	)
}
