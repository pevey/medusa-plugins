import { Avatar, clx, Text, Tooltip } from '@medusajs/ui'
import { PencilSquare, Trash } from '@medusajs/icons'
import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useDate } from '../hooks/date'
import { useDeleteNote } from '../hooks/complaints'
import { ActionMenu } from './action-menu'
import { ComplaintNoteModal } from './complaint-note-modal'
import { AdminComplaintActivity, ComplaintActivityType } from '../types'

export type ComplaintActivityEntryProps = {
	entry: AdminComplaintActivity
	isFirst?: boolean
}

const handleDeleteNote = () => {}

export const ComplaintActivityEntry = ({ entry, isFirst }: ComplaintActivityEntryProps) => {
	const { mutate: deleteNote } = useDeleteNote(entry.complaint_id, entry.id)
	const { getFullDate, getRelativeDate } = useDate()
	const [editNoteOpen, setEditNoteOpen] = useState(false)

	const { user } = entry
	const name = [user.first_name, user.last_name].filter(Boolean).join(' ')
	const fallback = name ? name.slice(0, 1) : user.email.slice(0, 1)
	const link = `/settings/users/${user.id}`

	const entryTitles: Record<ComplaintActivityType, string> = {
		open: 'Complaint opened',
		close: 'Complaint closed',
		note: 'Note Added'
	}

	let noteArr: string[] = []
	if (entry.type === 'note' && typeof entry.note === 'string') {
		// entry.note = entry.note.replace(/\n/g, '<br />')
		//convert into an array split by new lines, and then join with <br />
		noteArr = entry.note.split('\n').map(line => line.trim())
	}

	return (
		<>
			<div className="grid grid-cols-[20px_1fr] items-start gap-2">
				<div className="flex size-full flex-col items-center gap-y-0.5">
					<div className="flex size-5 items-center justify-center">
						<div className="bg-ui-bg-base shadow-borders-base flex size-2.5 items-center justify-center rounded-full">
							<div className="bg-ui-tag-neutral-icon size-1.5 rounded-full" />
						</div>
					</div>
					{!isFirst && <div className="bg-ui-border-base w-px flex-1" />}
				</div>
				<div
					className={clx({
						'pb-4': !isFirst
					})}
				>
					<div className="flex items-center justify-between">
						<Text size="small" leading="compact" weight="plus">
							{entryTitles[entry.type]}
						</Text>
						<Tooltip content={getFullDate({ date: entry.created_at, includeTime: true })}>
							<Text size="small" leading="compact" className="text-ui-fg-subtle text-right">
								{getRelativeDate(entry.created_at)}
							</Text>
						</Tooltip>
					</div>
					<div>
						<Text className="text-ui-fg-subtle">
							<Link
								to={link}
								className="transition-fg hover:text-ui-fg-subtle focus-visible:shadow-borders-focus flex w-fit items-center gap-x-2 rounded-md outline-none"
							>
								By <Avatar size="2xsmall" fallback={fallback.toUpperCase()} />
								<Text size="small" leading="compact" weight="regular">
									{name || user.email}
								</Text>
							</Link>
						</Text>
					</div>
					{entry.type === 'note' && (
						<div className="flex">
							<div className="flex flex-grow items-center">
								<Text leading="compact" className="text-ui-fg-subtle">
									{noteArr.map((line, index) => (
										<span key={index}>
											{line}
											<br />
										</span>
									))}
								</Text>
							</div>
							<div className="flex items-start">
								<ActionMenu
									groups={[
										{
											actions: [
												{
													label: 'Edit Note',
													icon: <PencilSquare />,
													onClick: () => {
														setEditNoteOpen(true)
													}
												},
												{
													label: 'Delete Note',
													icon: <Trash />,
													onClick: () => {
														handleDeleteNote()
													}
												}
											]
										}
									]}
								/>
							</div>
						</div>
					)}
				</div>
			</div>
			<ComplaintNoteModal
				open={editNoteOpen}
				setOpen={setEditNoteOpen}
				complaintId={entry.complaint_id}
				note={entry}
			/>
		</>
	)
}
