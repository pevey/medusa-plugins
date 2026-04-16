import { Button, Container, Heading, Text, usePrompt } from '@medusajs/ui'
import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ComplaintActivityEntry } from './complaint-activity-entry'
import { ComplaintNoteModal } from './complaint-note-modal'
import { AdminComplaint } from '../types'
import { useComplaintActivities } from '../hooks/complaints'

export type ComplaintActivityProps = {
	complaint: AdminComplaint
}

export const ComplaintActivity = ({ complaint }: ComplaintActivityProps) => {
	const [createNoteOpen, setCreateNoteOpen] = useState(false)
	const navigate = useNavigate()
	const prompt = usePrompt()

	const { data, isLoading } = useComplaintActivities(complaint.id)
	const entries = data?.activities

	return (
		<>
			<Container className="divide-y p-0">
				<div className="flex items-center justify-between px-6 py-4">
					<Heading level="h2">Activity</Heading>
					<Button size="small" variant="secondary" onClick={() => setCreateNoteOpen(true)}>
						Add Note
					</Button>
				</div>
				<div className="flex flex-col p-6 gap-y-0.5">
					{isLoading && <p>Loading activity...</p>}
					{!isLoading && entries?.length === 0 && (
						<div className="px-6 py-4">
							<Text size="small" className="text-ui-fg-subtle">
								No activity found.
							</Text>
						</div>
					)}
					{!isLoading &&
						entries
							?.sort(
								(a, b) =>
									new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
							)
							.map((entry, index) => (
								<ComplaintActivityEntry
									isFirst={index === entries.length - 1}
									entry={entry}
								/>
							))}
				</div>
			</Container>
			<ComplaintNoteModal
				open={createNoteOpen}
				setOpen={setCreateNoteOpen}
				complaintId={complaint.id}
			/>
		</>
	)
}
