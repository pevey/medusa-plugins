import { Body, Container, Head, Heading, Html, Preview, Section, Tailwind, Text } from 'react-email'

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
			<Html className="bg-gray-100 font-sans">
				<Head />
				<Preview>New submission: {formName}</Preview>
				<Body className="mx-auto my-10 w-full max-w-2xl bg-white">
					<Container className="p-6">
						<Heading className="mb-2 text-center text-lg font-semibold text-black">New Form Submission</Heading>

						<Text className="mb-1 text-center text-sm leading-relaxed text-black">
							A new submission was received for <span className="font-semibold">{formName}</span>.
						</Text>
						<Text className="mb-6 text-center text-xs text-gray-500">{submittedAt}</Text>

						{/* Fields */}
						{fields.map((field, i) => (
							<Section
								key={i}
								className={`bg-gray-50 px-4 py-3 ${
									i === 0 ? 'rounded-t-lg' : i === fields.length - 1 ? 'rounded-b-lg' : ''
								} ${i < fields.length - 1 ? 'border-b border-gray-200' : ''}`}
							>
								<Text className="m-0 mb-1 text-xs font-medium tracking-wide text-gray-500 uppercase">{field.label}</Text>
								<Text className="m-0 text-sm leading-relaxed text-black">{field.value || '—'}</Text>
							</Section>
						))}
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
