import { useState } from 'react'
import { Badge, CodeBlock, Text } from '@medusajs/ui'

type ToolCallInfo = {
	name: string
	args: Record<string, unknown>
	result: string
}

type ChatMessageProps = {
	role: 'user' | 'assistant'
	content: string
	toolCalls?: ToolCallInfo[]
}

const ToolCallBlock = ({ toolCall }: { toolCall: ToolCallInfo }) => {
	const [expanded, setExpanded] = useState(false)

	return (
		<div className="my-1">
			<button
				onClick={() => setExpanded(!expanded)}
				className="flex items-center gap-1.5 text-xs text-ui-fg-subtle hover:text-ui-fg-base transition-colors"
			>
				<Badge size="2xsmall" color="grey">{toolCall.name}</Badge>
				<span>{expanded ? '▼' : '▶'}</span>
			</button>
			{expanded && (
				<div className="mt-1 ml-2">
					<CodeBlock
						snippets={[
							{
								label: `${toolCall.name}(${JSON.stringify(toolCall.args)})`,
								language: 'json',
								code: toolCall.result,
								hideLineNumbers: true
							}
						]}
					>
						<CodeBlock.Body className="text-xs [&_code]:text-xs max-h-48 overflow-y-auto" />
					</CodeBlock>
				</div>
			)}
		</div>
	)
}

export const ChatMessage = ({ role, content, toolCalls }: ChatMessageProps) => {
	if (role === 'user') {
		return (
			<div className="max-w-[80%] self-end rounded-lg px-4 py-2.5 bg-ui-bg-subtle text-ui-fg-base">
				<Text size="small">{content}</Text>
			</div>
		)
	}

	return (
		<div className="max-w-[90%] self-start flex flex-col gap-1">
			{toolCalls && toolCalls.length > 0 && (
				<div className="flex flex-col gap-0.5">
					{toolCalls.map((tc, i) => (
						<ToolCallBlock key={i} toolCall={tc} />
					))}
				</div>
			)}
			{content && (
				<div className="rounded-lg px-4 py-2.5 bg-ui-bg-base border border-ui-border-base">
					<Text size="small" className="whitespace-pre-wrap">{content}</Text>
				</div>
			)}
		</div>
	)
}
