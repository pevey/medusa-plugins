import {
	Text,
	Container,
	Heading,
	Html,
	Section,
	Tailwind,
	Head,
	Preview,
	Body,
	Button
} from 'react-email'

type Props = {
	storeName: string
}

function Template({ storeName }: Props) {
	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>{`Welcome to ${storeName ?? ''} — you're all set!`}</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl">
					{/* Main Content */}
					<Container className="p-6 text-center">
						<Heading className="text-lg font-semibold text-black mb-6">
							Welcome to {storeName ?? ''}!
						</Heading>

						<Text className="text-sm text-black leading-relaxed mb-4">
							Your invitation has been accepted and your account is ready to go. We're excited to
							have you on the team.
						</Text>

						<Text className="text-sm text-black leading-relaxed mb-6">
							To help you get started, check out the Medusa Admin User Guide — it covers
							everything from managing orders and products to configuring your store settings.
						</Text>

						<Section className="text-center my-8">
							<Button
								href="https://docs.medusajs.com/user-guide"
								className="bg-black text-white py-3 px-8 inline-block"
							>
								View the Admin User Guide
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

export default function getInviteAcceptedTemplate(props?: Props) {
	return <Template storeName={props?.storeName ?? 'Demo Store'} />
}
