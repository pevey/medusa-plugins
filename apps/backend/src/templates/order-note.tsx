import {
	Body,
	Container,
	Head,
	Heading,
	Html,
	Preview,
	Section,
	Tailwind,
	Text
} from 'react-email'

type Props = {
	customerFirstName: string
	orderDisplayId: number
	note: string
	storeName: string
}

function Template({ customerFirstName, orderDisplayId, note, storeName }: Props) {
	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>{`A message about your order #${orderDisplayId}`}</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl">
					<Container className="p-6">
						<Heading className="text-lg font-semibold text-black mb-2 text-center">
							A Message About Your Order
						</Heading>

						<Text className="text-sm text-black leading-relaxed mb-6 text-center">
							Hi {customerFirstName}, we have a message for you regarding order #
							{orderDisplayId}.
						</Text>

						<Section className="bg-gray-50 rounded-lg px-5 py-4">
							<Text className="text-sm text-black leading-relaxed m-0">
								{note}
							</Text>
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
