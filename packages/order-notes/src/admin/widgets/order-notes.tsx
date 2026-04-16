import { useState } from 'react'
import { defineWidgetConfig } from '@medusajs/admin-sdk'
import { DetailWidgetProps, AdminOrder } from '@medusajs/framework/types'
import { Badge, Button, Checkbox, Container, Heading, Label, Text, Textarea, toast } from '@medusajs/ui'
import { Trash } from '@medusajs/icons'
import { AdminOrderNote } from '../types'
import { useOrderNotes, useCreateOrderNote, useDeleteOrderNote } from '../hooks/order-notes'

export const config = defineWidgetConfig({
	zone: 'order.details.after'
})

const OrderNotesWidget = ({ data: order }: DetailWidgetProps<AdminOrder>) => {
	const [showForm, setShowForm] = useState(false)
	const [noteText, setNoteText] = useState('')
	const [sendToCustomer, setSendToCustomer] = useState(false)

	const { data: notesData, isLoading } = useOrderNotes(order.id)
	const createMutation = useCreateOrderNote(order.id)
	const deleteMutation = useDeleteOrderNote(order.id)

	const notes: AdminOrderNote[] = notesData?.order_notes ?? []

	return (
		<Container className="divide-y p-0">
			<div className="flex items-center justify-between px-6 py-4">
				<Heading level="h2">Order Notes</Heading>
				<Button
					size="small"
					variant="secondary"
					onClick={() => {
						setShowForm(prev => !prev)
						setNoteText('')
						setSendToCustomer(false)
					}}
				>
					{showForm ? 'Cancel' : 'Add Note'}
				</Button>
			</div>

			{showForm && (
				<div className="flex flex-col gap-3 px-6 py-4">
					<Textarea
						placeholder="Write a note..."
						value={noteText}
						onChange={e => setNoteText(e.target.value)}
						rows={3}
					/>
					<div className="flex items-center gap-2">
						<Checkbox
							id="send-to-customer"
							checked={sendToCustomer}
							onCheckedChange={checked => setSendToCustomer(checked === true)}
						/>
						<Label htmlFor="send-to-customer" className="cursor-pointer">
							Send to customer
						</Label>
					</div>
					<div className="flex justify-end">
						<Button
							size="small"
							disabled={!noteText.trim() || createMutation.isPending}
							isLoading={createMutation.isPending}
							onClick={() =>
						createMutation.mutate(
							{ order_id: order.id, note: noteText, sent: sendToCustomer },
							{
								onSuccess: () => {
									setNoteText('')
									setSendToCustomer(false)
									setShowForm(false)
									toast.success(sendToCustomer ? 'Note added and sent to customer' : 'Note added')
								},
								onError: () => toast.error('Failed to add note')
							}
						)
					}
						>
							Save
						</Button>
					</div>
				</div>
			)}

			{isLoading ? (
				<div className="px-6 py-4">
					<Text size="small" className="text-ui-fg-muted">Loading...</Text>
				</div>
			) : notes.length === 0 ? (
				<div className="px-6 py-4">
					<Text size="small" className="text-ui-fg-subtle">No notes for this order.</Text>
				</div>
			) : (
				notes.map(note => (
					<div key={note.id} className="flex items-start justify-between gap-4 px-6 py-4">
						<div className="flex flex-col gap-1 flex-1 min-w-0">
							<Text size="small" className="whitespace-pre-wrap break-words">
								{note.note}
							</Text>
							<div className="flex items-center gap-2 mt-1">
								<Text size="xsmall" className="text-ui-fg-muted">
									{new Date(note.created_at).toLocaleString()}
								</Text>
								{note.sent && (
									<Badge size="xsmall" color="blue">
										Sent to customer
									</Badge>
								)}
							</div>
						</div>
						<button
							className="text-ui-fg-muted hover:text-ui-fg-base flex-shrink-0 mt-0.5"
							onClick={() =>
								deleteMutation.mutate(note.id, {
									onSuccess: () => toast.success('Note deleted'),
									onError: () => toast.error('Failed to delete note')
								})
							}
							aria-label="Delete note"
						>
							<Trash className="h-4 w-4" />
						</button>
					</div>
				))
			)}
		</Container>
	)
}

export default OrderNotesWidget
