import { useState } from 'react'
import { Badge, CodeBlock, Text } from '@medusajs/ui'
import { Spinner } from '@medusajs/icons'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { ChatMessage as ChatMessageType, TextBlock, ToolUseBlock } from '../hooks/chat'

const ToolCallCard = ({ block }: { block: ToolUseBlock }) => {
	const [expanded, setExpanded] = useState(false)
	const pending = block.result === undefined

	return (
		<div className="my-1">
			<button
				onClick={() => !pending && setExpanded(!expanded)}
				disabled={pending}
				className="text-ui-fg-subtle hover:text-ui-fg-base flex items-center gap-1.5 text-xs transition-colors disabled:cursor-default"
			>
				<Badge size="2xsmall" color={block.is_error ? 'red' : 'grey'}>
					{block.name}
				</Badge>
				{pending ? <Spinner className="text-ui-fg-subtle animate-spin" /> : <span>{expanded ? '▼' : '▶'}</span>}
			</button>
			{!pending && expanded && (
				<div className="mt-1 ml-2">
					<CodeBlock
						snippets={[
							{
								label: `${block.name}(${JSON.stringify(block.input)})`,
								language: 'json',
								code: block.result ?? '',
								hideLineNumbers: true
							}
						]}
					>
						<CodeBlock.Body className="max-h-48 overflow-y-auto text-xs [&_code]:text-xs" />
					</CodeBlock>
				</div>
			)}
		</div>
	)
}

const markdownComponents = {
	p: ({ children }: { children?: React.ReactNode }) => (
		<Text size="small" className="whitespace-pre-wrap [&:not(:first-child)]:mt-2">
			{children}
		</Text>
	),
	a: ({ children, href }: { children?: React.ReactNode; href?: string }) => (
		<a href={href} target="_blank" rel="noreferrer" className="text-ui-fg-interactive hover:underline">
			{children}
		</a>
	),
	code: ({ children }: { children?: React.ReactNode }) => <code className="bg-ui-bg-subtle rounded px-1 py-0.5 text-xs">{children}</code>,
	ul: ({ children }: { children?: React.ReactNode }) => <ul className="list-disc pl-5 text-sm">{children}</ul>,
	ol: ({ children }: { children?: React.ReactNode }) => <ol className="list-decimal pl-5 text-sm">{children}</ol>
}

export type ChatMessageProps = {
	message: ChatMessageType
}

export const ChatMessage = ({ message }: ChatMessageProps) => {
	const { role, content } = message

	if (role === 'user') {
		const text = content
			.filter((b): b is TextBlock => b.type === 'text')
			.map(b => b.text)
			.join('')

		return (
			<div className="bg-ui-bg-subtle text-ui-fg-base max-w-[80%] self-end rounded-lg px-4 py-2.5">
				<Text size="small" className="whitespace-pre-wrap">
					{text}
				</Text>
			</div>
		)
	}

	const toolBlocks = content.filter((b): b is ToolUseBlock => b.type === 'tool_use')
	const textContent = content
		.filter((b): b is TextBlock => b.type === 'text')
		.map(b => b.text)
		.join('')

	return (
		<div className="flex max-w-[90%] flex-col gap-1 self-start">
			{toolBlocks.length > 0 && (
				<div className="flex flex-col gap-0.5">
					{toolBlocks.map(block => (
						<ToolCallCard key={block.id} block={block} />
					))}
				</div>
			)}
			{textContent && (
				<div className="bg-ui-bg-base border-ui-border-base rounded-lg border px-4 py-2.5">
					<ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
						{textContent}
					</ReactMarkdown>
				</div>
			)}
		</div>
	)
}
