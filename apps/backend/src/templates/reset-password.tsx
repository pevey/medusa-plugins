import { Text, Container, Heading, Html, Section, Tailwind, Head, Preview, Body, Button } from 'react-email'

type ResetPasswordEmailProps = {
	resetPasswordUrl: string
	storeName: string
}

function Template({ resetPasswordUrl, storeName }: ResetPasswordEmailProps) {
	return (
		<Tailwind>
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>Reset your password</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					{/* Main Content */}
					<Container className="p-6 text-center">
						<Heading className="mb-6 text-lg font-semibold text-black">You have submitted a password change request.</Heading>

						<Section className="my-8 text-center">
							<Button href={resetPasswordUrl} className="inline-block bg-black px-8 py-3 text-white">
								Reset password
							</Button>
						</Section>

						<Text className="mt-6 text-sm leading-relaxed text-black">If you didn't request a password reset, you can safely ignore this email.</Text>
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

export default function getResetPasswordTemplate(props?: ResetPasswordEmailProps) {
	return <Template resetPasswordUrl={props?.resetPasswordUrl ?? '#'} storeName={props?.storeName ?? 'Demo Store'} />
}
