import { Text, Container, Heading, Html, Section, Tailwind, Head, Preview, Body, Button } from 'react-email'

type InviteEmailProps = {
	inviteUrl: string
	storeName: string
}

function Template({ inviteUrl, storeName }: InviteEmailProps) {
	return (
		<Tailwind>
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>{`You've been invited to join ${storeName ?? ''}`}</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					{/* Main Content */}
					<Container className="p-6 text-center">
						<Heading className="mb-6 text-lg font-semibold text-black">You've been invited to join {storeName ?? ''}</Heading>

						<Text className="mb-6 text-sm leading-relaxed text-black">Click the button below to accept the invitation and get started.</Text>

						<Section className="my-8 text-center">
							<Button href={inviteUrl} className="inline-block bg-black px-8 py-3 text-white">
								Accept invitation
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

export default function getInviteTemplate(props?: InviteEmailProps) {
	return <Template inviteUrl={props?.inviteUrl ?? '#'} storeName={props?.storeName ?? 'Demo Store'} />
}
