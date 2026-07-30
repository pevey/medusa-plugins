import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Preview, Row, Section, Tailwind, Text } from 'react-email'

type ShipmentItem = {
	title: string
	quantity: number
	thumbnail?: string
}

type Address = {
	first_name?: string
	last_name?: string
	address_1?: string
	address_2?: string
	city?: string
	province?: string
	postal_code?: string
	country_code?: string
}

type Props = {
	order: {
		display_id: number
		customer: {
			first_name: string
			last_name: string
		}
		shipping_address: Address
	}
	shipment: {
		tracking_number: string
		tracking_url: string
		items: ShipmentItem[]
	}
	storeName: string
}

function Template({ order, shipment, storeName }: Props) {
	const addr = order.shipping_address
	const fullName = `${order.customer.first_name} ${order.customer.last_name}`

	return (
		<Tailwind>
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>
					Hi {order.customer.first_name}, your order has shipped! We provided a tracking number to help you review the status of your shipment.
				</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					<Container className="p-6">
						<Heading className="mb-2 text-center text-lg font-semibold text-black">Your Order Has Shipped</Heading>

						<Text className="mb-6 text-center text-sm leading-relaxed text-black">
							Hi {order.customer.first_name}, your order has shipped and is on its way.
						</Text>

						{/* Shipping address + order details */}
						<Section className="mb-4">
							<Row>
								<Column className="w-1/2 align-top">
									<Heading className="m-0 mb-2 text-sm font-semibold text-black">Shipping Address</Heading>
									<Text className="m-0 text-sm leading-relaxed text-black">
										{fullName}
										<br />
										{addr.address_1}
										<br />
										{addr.address_2 ? (
											<>
												{addr.address_2}
												<br />
											</>
										) : null}
										{addr.city}, {addr.province} {addr.postal_code}
										<br />
										{addr.country_code?.toUpperCase()}
									</Text>
								</Column>
								<Column className="w-1/2 align-top">
									<Heading className="m-0 mb-2 text-sm font-semibold text-black">Order Details</Heading>
									<Text className="m-0 text-sm leading-relaxed text-black">
										Tracking No:{' '}
										<a href={shipment.tracking_url} className="text-black">
											{shipment.tracking_number}
										</a>
										<br />
										Order No: {order.display_id}
									</Text>
								</Column>
							</Row>
						</Section>

						<Hr className="my-4 border-gray-200" />

						{/* Line items */}
						{shipment.items.map((item, i) => (
							<Section key={i} className="py-2">
								<Row>
									<Column className="w-1/6 align-middle">
										{item.thumbnail ? <Img src={item.thumbnail} width="100%" alt={item.title} className="rounded-lg" /> : null}
									</Column>
									<Column className="pl-4 align-middle">
										<Text className="m-0 text-sm text-black">
											<span className="font-semibold">{item.title}</span>
											<br />
											<span className="text-xs">Qty: {item.quantity}</span>
										</Text>
									</Column>
								</Row>
							</Section>
						))}

						<Hr className="my-4 border-gray-200" />

						{/* Track button */}
						<Section className="my-8 text-center">
							<Button href={shipment.tracking_url} className="inline-block bg-black px-8 py-3 text-white">
								Track Your Order
							</Button>
						</Section>
					</Container>

					{/* Footer */}
					<Section className="mt-10 bg-gray-50 p-6">
						<Text className="mt-4 text-center text-xs text-black">
							© {new Date().getFullYear()} {storeName}, Inc. All rights reserved.
						</Text>
					</Section>
				</Body>
			</Html>
		</Tailwind>
	)
}

export default function getShipmentCreatedTemplate(props?: Props) {
	return (
		<Template
			order={
				props?.order ?? {
					display_id: 10001,
					customer: { first_name: 'Jane', last_name: 'Doe' },
					shipping_address: {
						first_name: 'Jane',
						last_name: 'Doe',
						address_1: '123 Main St',
						city: 'Henderson',
						province: 'NV',
						postal_code: '89052',
						country_code: 'US'
					}
				}
			}
			shipment={
				props?.shipment ?? {
					tracking_number: '1Z999AA10123456784',
					tracking_url: '#',
					items: [{ title: 'Sample Product', quantity: 1 }]
				}
			}
			storeName={props?.storeName ?? 'Demo Store'}
		/>
	)
}
