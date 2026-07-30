import { Body, Container, Head, Heading, Html, Preview, Section, Tailwind, Text } from 'react-email'

type Props = {
	customerFirstName: string
	orderDisplayId: number
	note: string
	storeName: string
}

function Template({ customerFirstName, orderDisplayId, note, storeName }: Props) {
	return (
		<Tailwind>
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>{`A message about your order #${orderDisplayId}`}</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					<Container className="p-6">
						<Heading className="mb-2 text-center text-lg font-semibold text-black">A Message About Your Order</Heading>

						<Text className="mb-6 text-center text-sm leading-relaxed text-black">
							Hi {customerFirstName}, we have a message for you regarding order #{orderDisplayId}.
						</Text>

						<Section className="rounded-lg bg-gray-50 px-5 py-4">
							<Text className="m-0 text-sm leading-relaxed text-black">{note}</Text>
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

export default function getOrderNoteTemplate(props?: Props) {
	return (
		<Template
			customerFirstName={props?.customerFirstName ?? 'Valued Customer'}
			orderDisplayId={props?.orderDisplayId ?? 10001}
			note={props?.note ?? 'Thank you for your order!'}
			storeName={props?.storeName ?? 'Demo Store'}
		/>
	)
}
