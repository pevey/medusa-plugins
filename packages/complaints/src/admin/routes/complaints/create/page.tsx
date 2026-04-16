import { useSearchParams, useNavigate } from 'react-router-dom'
import { CreateComplaintModal } from '../../../components/create-complaint-modal'
import { useState } from 'react'

const CreateComplaintPage = () => {
	const [searchParams] = useSearchParams()
	const navigate = useNavigate()

	const customerId = searchParams.get('customer_id') ?? ''
	const orderId = searchParams.get('order_id') ?? ''

	const [createOpen, setCreateOpen] = useState(true)
	const handleOpenChange = (open: boolean) => {
		setCreateOpen(open)
		if (!open) {
			navigate('/complaints', { replace: true })
		}
	}

	return (
		<CreateComplaintModal
			customerId={customerId}
			orderId={orderId}
			open={createOpen}
			setOpen={handleOpenChange}
		/>
	)
}

export default CreateComplaintPage
