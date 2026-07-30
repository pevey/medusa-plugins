import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Preview, Row, Section, Tailwind, Text } from 'react-email'

type DeliveryItem = {
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
	delivery: {
		carrier_name: string
		tracking_number: string
		tracking_url: string | null
		items: DeliveryItem[]
	}
	storeName: string
}

function Template({ order, delivery, storeName }: Props) {
	const addr = order.shipping_address
	const fullName = `${order.customer.first_name} ${order.customer.last_name}`

	return (
		<Tailwind>
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>Hi {order.customer.first_name}, great news — your order is out for delivery!</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					<Container className="p-6">
						<Heading className="mb-2 text-center text-lg font-semibold text-black">Your Order Is Out for Delivery</Heading>

						<Text className="mb-6 text-center text-sm leading-relaxed text-black">
							Hi {order.customer.first_name}, great news — your order is on its way and should arrive today.
						</Text>

						{/* Shipping address + delivery details */}
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
									<Heading className="m-0 mb-2 text-sm font-semibold text-black">Delivery Details</Heading>
									<Text className="m-0 text-sm leading-relaxed text-black">
										Carrier: {delivery.carrier_name}
										<br />
										{delivery.tracking_url ? (
											<>
												Tracking:{' '}
												<a href={delivery.tracking_url} className="text-black">
													{delivery.tracking_number}
												</a>
											</>
										) : (
											<>Tracking: {delivery.tracking_number}</>
										)}
										<br />
										Order No: {order.display_id}
									</Text>
								</Column>
							</Row>
						</Section>

						<Hr className="my-4 border-gray-200" />

						{/* Line items */}
						{delivery.items.map((item, i) => (
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
						{delivery.tracking_url ? (
							<Section className="my-8 text-center">
								<Button href={delivery.tracking_url} className="inline-block bg-black px-8 py-3 text-white">
									Track Your Delivery
								</Button>
							</Section>
						) : null}
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

export default function getDeliveryCreatedTemplate(props?: Props) {
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
			delivery={
				props?.delivery ?? {
					carrier_name: 'UPS',
					tracking_number: '1Z999AA10123456784',
					tracking_url: '#',
					items: [{ title: 'Sample Product', quantity: 1 }]
				}
			}
			storeName={props?.storeName ?? 'Demo Store'}
		/>
	)
}
