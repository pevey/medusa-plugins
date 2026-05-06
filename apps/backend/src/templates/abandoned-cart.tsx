import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Preview,
	Row,
	Section,
	Tailwind,
	Text
} from 'react-email'

type CartItem = {
	title: string
	quantity: number
	unit_price: number
	thumbnail?: string
}

type Props = {
	customer_first_name: string
	recovery_url: string
	items: CartItem[]
	storeName: string
}

function formatMoney(cents: number) {
	return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

function Template({ customer_first_name, recovery_url, items, storeName }: Props) {
	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>
					Hi {customer_first_name}, you left something in your cart — complete your purchase
					before it's gone.
				</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl">
					<Container className="p-6">
						<Heading className="text-lg font-semibold text-black mb-2 text-center">
							You Left Something Behind
						</Heading>

						<Text className="text-sm text-black leading-relaxed mb-6 text-center">
							Hi {customer_first_name}, you left some items in your cart. Complete your
							purchase today.
						</Text>

						<Hr className="border-gray-200 my-4" />

						{/* Line items */}
						{items.map((item, i) => (
							<Section key={i} className="py-2">
								<Row>
									<Column className="w-1/6 align-middle">
										{item.thumbnail ? (
											<Img
												src={item.thumbnail}
												width="100%"
												alt={item.title}
												className="rounded-lg"
											/>
										) : null}
									</Column>
									<Column className="pl-4 align-middle">
										<Text className="text-sm text-black m-0">
											<span className="font-semibold">{item.title}</span>
											<br />
											<span className="text-xs">Qty: {item.quantity}</span>
										</Text>
									</Column>
									<Column className="text-right align-middle">
										<Text className="text-sm text-black font-semibold m-0">
											{formatMoney(item.unit_price)}
										</Text>
									</Column>
								</Row>
							</Section>
						))}

						<Hr className="border-gray-200 my-4" />

						{/* CTA */}
						<Section className="text-center my-8">
							<Button
								href={recovery_url}
								className="bg-black text-white py-3 px-8 inline-block"
							>
								Complete Your Purchase
							</Button>
						</Section>
					</Container>

					{/* Footer */}
					<Section className="bg-gray-50 p-6 mt-10">
						<Text className="text-center text-black text-xs mt-4">
							© {new Date().getFullYear()} {storeName}, Inc. All rights reserved.
						</Text>
					</Section>
				</Body>
			</Html>
		</Tailwind>
	)
}

export default function getAbandonedCartTemplate(props?: Props) {
	return (
		<Template
			customer_first_name={props?.customer_first_name ?? 'there'}
			recovery_url={props?.recovery_url ?? '#'}
			items={
				props?.items ?? [{ title: 'Sample Product', quantity: 1, unit_price: 9900 }]
			}
			storeName={props?.storeName ?? 'Demo Store'}
		/>
	)
}
