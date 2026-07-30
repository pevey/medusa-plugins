import { Body, Button, Column, Container, Head, Heading, Hr, Html, Img, Preview, Row, Section, Tailwind, Text } from 'react-email'

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
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>Hi {customer_first_name}, you left something in your cart — complete your purchase before it's gone.</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					<Container className="p-6">
						<Heading className="mb-2 text-center text-lg font-semibold text-black">You Left Something Behind</Heading>

						<Text className="mb-6 text-center text-sm leading-relaxed text-black">
							Hi {customer_first_name}, you left some items in your cart. Complete your purchase today.
						</Text>

						<Hr className="my-4 border-gray-200" />

						{/* Line items */}
						{items.map((item, i) => (
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
									<Column className="text-right align-middle">
										<Text className="m-0 text-sm font-semibold text-black">{formatMoney(item.unit_price)}</Text>
									</Column>
								</Row>
							</Section>
						))}

						<Hr className="my-4 border-gray-200" />

						{/* CTA */}
						<Section className="my-8 text-center">
							<Button href={recovery_url} className="inline-block bg-black px-8 py-3 text-white">
								Complete Your Purchase
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

export default function getAbandonedCartTemplate(props?: Props) {
	return (
		<Template
			customer_first_name={props?.customer_first_name ?? 'there'}
			recovery_url={props?.recovery_url ?? '#'}
			items={props?.items ?? [{ title: 'Sample Product', quantity: 1, unit_price: 9900 }]}
			storeName={props?.storeName ?? 'Demo Store'}
		/>
	)
}
