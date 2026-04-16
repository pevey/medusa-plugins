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
} from '@react-email/components'

type FieldEntry = { label: string; value: string }

type Props = {
	formName: string
	submittedAt: string
	fields: FieldEntry[]
	storeName: string
}

function Template({ formName, submittedAt, fields, storeName }: Props) {
	return (
		<Tailwind>
			<Html className="font-sans bg-gray-100">
				<Head />
				<Preview>New submission: {formName}</Preview>
				<Body className="bg-white my-10 mx-auto w-full max-w-2xl">
					<Container className="p-6">
						<Heading className="text-lg font-semibold text-black mb-2 text-center">
							New Form Submission
						</Heading>

						<Text className="text-sm text-black leading-relaxed mb-1 text-center">
							A new submission was received for <span className="font-semibold">{formName}</span>.
						</Text>
						<Text className="text-xs text-gray-500 text-center mb-6">
							{submittedAt}
						</Text>

						{/* Fields */}
						{fields.map((field, i) => (
							<Section
								key={i}
								className={`bg-gray-50 px-4 py-3 ${
									i === 0
										? 'rounded-t-lg'
										: i === fields.length - 1
											? 'rounded-b-lg'
											: ''
								} ${i < fields.length - 1 ? 'border-b border-gray-200' : ''}`}
							>
								<Text className="text-xs font-medium text-gray-500 uppercase tracking-wide m-0 mb-1">
									{field.label}
								</Text>
								<Text className="text-sm text-black leading-relaxed m-0">
									{field.value || '—'}
								</Text>
							</Section>
						))}
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

export default function getFormSubmissionTemplate(props?: Props) {
	return (
		<Template
			formName={props?.formName ?? 'Contact Form'}
			submittedAt={props?.submittedAt ?? new Date().toLocaleString()}
			fields={
				props?.fields ?? [
					{ label: 'Name', value: 'John Doe' },
					{ label: 'Email', value: 'john@example.com' },
					{ label: 'Message', value: 'Hello, I have a question about your product.' }
				]
			}
			storeName={props?.storeName ?? 'Demo Store'}
		/>
	)
}
