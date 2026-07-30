import { DropdownMenu, IconButton } from '@medusajs/ui'
import { EllipsisHorizontal } from '@medusajs/icons'
import { type ReactNode } from 'react'

export type ActionMenuItem = {
	icon?: ReactNode
	label: string
	onClick: () => void
	disabled?: boolean
}

export type ActionMenuGroup = {
	label?: string
	actions: ActionMenuItem[]
}

export const ActionMenu = ({ groups }: { groups: ActionMenuGroup[] }) => (
	<DropdownMenu>
		<DropdownMenu.Trigger asChild>
			<IconButton size="small" variant="transparent" aria-label="More actions">
				<EllipsisHorizontal />
			</IconButton>
		</DropdownMenu.Trigger>
		<DropdownMenu.Content>
			{groups.map((g, i) => (
				<div key={i}>
					{g.label && <DropdownMenu.Label>{g.label}</DropdownMenu.Label>}
					{g.actions.map((a, j) => (
						<DropdownMenu.Item key={j} onClick={a.onClick} disabled={a.disabled}>
							{a.icon}
							<span className="ml-2">{a.label}</span>
						</DropdownMenu.Item>
					))}
					{i < groups.length - 1 && <DropdownMenu.Separator />}
				</div>
			))}
		</DropdownMenu.Content>
	</DropdownMenu>
)
