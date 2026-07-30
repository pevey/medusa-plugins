import { Text, Container, Heading, Html, Section, Tailwind, Head, Preview, Body, Button } from 'react-email'

type Props = {
	storeName: string
}

function Template({ storeName }: Props) {
	return (
		<Tailwind>
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>{`Welcome to ${storeName ?? ''} — you're all set!`}</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					{/* Main Content */}
					<Container className="p-6 text-center">
						<Heading className="mb-6 text-lg font-semibold text-black">Welcome to {storeName ?? ''}!</Heading>

						<Text className="mb-4 text-sm leading-relaxed text-black">
							Your invitation has been accepted and your account is ready to go. We're excited to have you on the team.
						</Text>

						<Text className="mb-6 text-sm leading-relaxed text-black">
							To help you get started, check out the Medusa Admin User Guide — it covers everything from managing orders and products to configuring your
							store settings.
						</Text>

						<Section className="my-8 text-center">
							<Button href="https://docs.medusajs.com/user-guide" className="inline-block bg-black px-8 py-3 text-white">
								View the Admin User Guide
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

export default function getInviteAcceptedTemplate(props?: Props) {
	return <Template storeName={props?.storeName ?? 'Demo Store'} />
}
