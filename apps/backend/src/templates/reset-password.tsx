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
} from '@react-email/components'

type ResetPasswordEmailProps = {
	resetPasswordUrl: string
	storeName: string
}

function Template({ resetPasswordUrl, storeName }: ResetPasswordEmailProps) {
	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>Reset your password</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl">
					{/* Main Content */}
					<Container className="p-6 text-center">
						<Heading className="text-lg font-semibold text-black mb-6">
							You have submitted a password change request.
						</Heading>

						<Section className="text-center my-8">
							<Button
								href={resetPasswordUrl}
								className="bg-black text-white py-3 px-8 inline-block"
							>
								Reset password
							</Button>
						</Section>

						<Text className="text-sm text-black leading-relaxed mt-6">
							If you didn't request a password reset, you can safely ignore this email.
						</Text>
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

export default function getResetPasswordTemplate(props?: ResetPasswordEmailProps) {
	return (
		<Template
			resetPasswordUrl={props?.resetPasswordUrl ?? '#'}
			storeName={props?.storeName ?? 'Demo Store'}
		/>
	)
}
