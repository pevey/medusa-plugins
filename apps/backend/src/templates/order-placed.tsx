import { CustomerDTO, OrderDTO } from '@medusajs/framework/types'
import {
	Body,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Preview,
	Row,
	Section,
	Tailwind,
	Text
} from '@react-email/components'

type OrderPlacedEmailProps = {
	order: {
		display_id: any
		created_at: any
		email: string
		customer: { first_name: any; last_name: any }
		shipping_address: any
		billing_address: any
		items: OrderItem[]
		subtotal: any
		shipping_total: any
		discount_total: any
		tax_total: any
		total: any
	}
	storeName: string
}

type OrderItem = {
	id: string
	title: string
	thumbnail?: string
	unit_price: number
	quantity: number
}

function Template({ order, storeName }: OrderPlacedEmailProps) {
	const getLocaleAmount = (amount: number) => {
		const formatter = new Intl.NumberFormat([], {
			style: 'currency',
			currencyDisplay: 'narrowSymbol',
			currency: 'USD'
		})

		return formatter.format(amount)
	}

	const items = order.items?.map(item => {
		const itemTotal = item.unit_price * item.quantity

		return (
			<Section key={item.id} className="border-b border-gray-200 py-4 px-0">
				<Row className="px-0">
					<Column className="w-1/6">
						<Img src={item.thumbnail ?? ''} alt={''} className="rounded-lg" width="100%" />
					</Column>
					<Column className="w-7/8 pl-4">
						<Text className="text-sm text-black my-2">{item.title}</Text>
						<Text className="text-xs text-black my-2">
							<span className="font-semibold">
								{item.quantity} x {getLocaleAmount(item.unit_price)}
							</span>
						</Text>
						<Text className="text-xs text-black font-bold my-2">
							{getLocaleAmount(itemTotal)}
						</Text>
					</Column>
				</Row>
			</Section>
		)
	})

	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>Thank you for your order from {storeName}</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl">
					{/* Greeting and Order Confirmation */}
					<Container className="p-6">
						<Heading className="text-lg font-normal text-black mb-6">
							Dear {order.customer?.first_name || order.shipping_address?.first_name},
						</Heading>

						<Text className="text-sm text-black leading-relaxed mb-6">
							Thank you for your order. Below you will find the details for your purchase.
						</Text>

						<div className="mb-6">
							<Text className="text-sm text-black m-0 mb-1">
								Order number: <span className="font-semibold">{order.display_id}</span>
							</Text>
							<Text className="text-sm text-black m-0">
								Order date:{' '}
								<span className="font-semibold">
									{new Date(order.created_at).toLocaleDateString('en-GB', {
										weekday: 'short',
										month: 'short',
										day: 'numeric',
										year: 'numeric'
									})}
								</span>
							</Text>
						</div>

						<Text className="text-sm text-black leading-relaxed">
							We're getting your order ready to be shipped. We will notify you when it has
							been sent. If you have any questions, please don't hesitate to contact us.
						</Text>
					</Container>

					{/* Order Items */}
					<Container className="px-6">
						<Heading className="text-base font-semibold text-black mb-2">Your Items</Heading>

						{items}

						{/* Order Summary */}
						<Section className="mt-8 border-t border-gray-200 pt-6">
							<Row className="text-black">
								<Column className="w-1/2">
									<Text className="text-sm m-0 mb-2">Subtotal (incl. VAT)</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text className="text-sm m-0 mb-2">
										{getLocaleAmount(order.subtotal as number)}
									</Text>
								</Column>
							</Row>
							<Row className="text-black">
								<Column className="w-1/2">
									<Text className="text-sm m-0 mb-2">Shipping Total</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text className="text-sm m-0 mb-2">
										{getLocaleAmount(order.shipping_total as number)}
									</Text>
								</Column>
							</Row>
							{Number(order.discount_total) > 0 ? (
								<Row className="text-black">
									<Column className="w-1/2">
										<Text className="text-sm m-0 mb-2">Discount</Text>
									</Column>
									<Column className="w-1/2 text-right">
										<Text className="text-sm m-0 mb-2">
											-{getLocaleAmount(order.discount_total as number)}
										</Text>
									</Column>
								</Row>
							) : null}
							<Row className="text-black font-bold">
								<Column className="w-1/2">
									<Text className="text-sm m-0 mb-2">Total</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text className="text-sm m-0 mb-2">
										{getLocaleAmount(order.total as number)}
									</Text>
								</Column>
							</Row>
							<Row className="text-black">
								<Column className="w-1/2">
									<Text className="text-sm m-0 italic">VAT Amount</Text>
								</Column>
								<Column className="w-1/2 text-right">
									<Text className="text-sm m-0 italic">
										{getLocaleAmount(order.tax_total as number)}
									</Text>
								</Column>
							</Row>
						</Section>

						{/* Shipping Address */}
						<Section className="mt-8 mb-8">
							<Heading className="text-base font-semibold text-black mb-2">
								Shipping Address
							</Heading>
							<Text className="text-sm text-black m-0 mb-1">
								{order.shipping_address?.first_name} {order.shipping_address?.last_name}
							</Text>
							<Text className="text-sm text-black m-0 mb-1">
								{order.shipping_address?.address_1}
							</Text>
							{order.shipping_address?.address_2 && (
								<Text className="text-sm text-black m-0 mb-1">
									{order.shipping_address?.address_2}
								</Text>
							)}
							<Text className="text-sm text-black m-0 mb-1">
								{order.shipping_address?.postal_code} {order.shipping_address?.city}
							</Text>
							<Text className="text-sm text-black m-0">
								{order.shipping_address?.country_code?.toUpperCase()}
							</Text>
						</Section>
					</Container>

					{/* Footer */}
					<Section className="bg-gray-50 p-6 mt-10">
						<Text className="text-center text-black text-sm">
							Order ID: {order.display_id}
						</Text>
						<Text className="text-center text-black text-xs mt-4">
							© {new Date().getFullYear()} {storeName}, Inc. All rights reserved.
						</Text>
					</Section>
				</Body>
			</Html>
		</Tailwind>
	)
}

export default function getOrderPlacedTemplate(props?: OrderPlacedEmailProps) {
	const demoData: OrderPlacedEmailProps['order'] = {
		display_id: 1234,
		email: 'customer@example.com',
		created_at: new Date().toISOString(),
		subtotal: 5999,
		shipping_total: 500,
		discount_total: 0,
		tax_total: 840,
		total: 6499,
		items: [
			{
				id: 'item_01',
				title: 'Premium Wireless Headphones',
				thumbnail: 'https://images.unsplash.com/photo-1618366712010-f4ae9c647dcb',
				unit_price: 2999,
				quantity: 2
			}
		],
		customer: {
			first_name: 'John',
			last_name: 'Doe'
		},
		shipping_address: {
			first_name: 'John',
			last_name: 'Doe',
			address_1: '123 Main Street',
			address_2: 'Apt 4B',
			city: 'New York',
			postal_code: '10001',
			country_code: 'us'
		},
		billing_address: {
			first_name: 'John',
			last_name: 'Doe',
			address_1: '123 Main Street',
			address_2: 'Apt 4B',
			city: 'New York',
			postal_code: '10001',
			country_code: 'us'
		}
	}

	return <Template order={props?.order ?? demoData} storeName={props?.storeName ?? 'Demo Store'} />
}
