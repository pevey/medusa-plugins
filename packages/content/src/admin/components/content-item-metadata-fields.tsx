import { Input, Label, Select, Switch, Text, Textarea } from '@medusajs/ui'
import { AdminContentField } from '../types'

type Props = {
	fields: AdminContentField[]
	value: Record<string, unknown>
	onChange: (value: Record<string, unknown>) => void
}

function getSelectOptions(field: AdminContentField): string[] | null {
	const opts = field.options as Record<string, unknown> | null | undefined
	return Array.isArray(opts?.values) ? (opts!.values as string[]) : null
}

export const ContentItemMetadataFields = ({ fields, value, onChange }: Props) => {
	if (!fields.length) return null

	const set = (name: string, val: unknown) => onChange({ ...value, [name]: val })

	const sorted = [...fields].sort((a, b) => a.sort_order - b.sort_order)

	return (
		<div className="flex flex-col gap-y-4">
			{sorted.map(field => {
				const current = value[field.name]
				const selectOptions = getSelectOptions(field)

				return (
					<div key={field.id} className="flex flex-col gap-y-2">
						<Label size="small" weight="plus">
							{field.label}
							{field.required && <span className="text-ui-fg-error ml-1">*</span>}
						</Label>

						{field.field_type === 'boolean' ? (
							<div className="flex items-center gap-x-2">
								<Switch checked={!!current} onCheckedChange={v => set(field.name, v)} />
								<Text size="small" className="text-ui-fg-subtle">
									{current ? 'Yes' : 'No'}
								</Text>
							</div>
						) : field.field_type === 'number' ? (
							<Input
								type="number"
								value={current != null ? String(current) : ''}
								onChange={e =>
									set(field.name, e.target.value !== '' ? Number(e.target.value) : null)
								}
							/>
						) : field.field_type === 'date' ? (
							<Input
								type="date"
								value={current != null ? String(current) : ''}
								onChange={e => set(field.name, e.target.value || null)}
							/>
						) : field.field_type === 'select' && selectOptions ? (
							<Select
								value={current != null ? String(current) : ''}
								onValueChange={v => set(field.name, v)}
							>
								<Select.Trigger>
									<Select.Value placeholder="Select..." />
								</Select.Trigger>
								<Select.Content>
									{selectOptions.map(opt => (
										<Select.Item key={opt} value={opt}>
											{opt}
										</Select.Item>
									))}
								</Select.Content>
							</Select>
						) : field.field_type === 'rich_text' ? (
							<Textarea
								rows={4}
								value={current != null ? String(current) : ''}
								onChange={e => set(field.name, e.target.value || null)}
							/>
						) : (
							<Input
								value={current != null ? String(current) : ''}
								placeholder={field.field_type === 'image' ? 'https://...' : ''}
								onChange={e => set(field.name, e.target.value || null)}
							/>
						)}
					</div>
				)
			})}
		</div>
	)
}
