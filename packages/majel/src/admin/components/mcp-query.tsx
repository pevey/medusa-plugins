import { useState, useRef, useEffect } from 'react'
import { Button, CodeBlock, Drawer, Heading, Input, Select, Text } from '@medusajs/ui'
import { ChatBubbleLeftRight } from '@medusajs/icons'

type McpTool = {
	name: string
	description: string
	inputSchema: Record<string, any>
}

type Message = {
	role: 'user' | 'assistant'
	content: string
}

// JSON-RPC helpers for MCP protocol (stateful sessions)
const baseUrl = import.meta.env.VITE_BACKEND_URL || ''
let rpcId = 1
let mcpSessionId: string | null = null

async function mcpRequest(method: string, params?: Record<string, unknown>) {
	const headers: Record<string, string> = {
		'Content-Type': 'application/json',
		Accept: 'application/json, text/event-stream'
	}
	if (mcpSessionId) {
		headers['mcp-session-id'] = mcpSessionId
	}

	const res = await fetch(`${baseUrl}/admin/mcp`, {
		method: 'POST',
		credentials: 'include',
		headers,
		body: JSON.stringify({
			jsonrpc: '2.0',
			id: rpcId++,
			method,
			params
		})
	})

	const newSessionId = res.headers.get('mcp-session-id')
	if (newSessionId) {
		mcpSessionId = newSessionId
	}

	if (!res.ok) {
		const text = await res.text()
		throw new Error(`MCP error ${res.status}: ${text}`)
	}

	return res.json()
}

async function mcpInitialize() {
	mcpSessionId = null
	return mcpRequest('initialize', {
		protocolVersion: '2025-03-26',
		capabilities: {},
		clientInfo: { name: 'medusa-admin-chat', version: '1.0.0' }
	})
}

async function mcpListTools(): Promise<McpTool[]> {
	const res = await mcpRequest('tools/list', {})
	return res?.result?.tools ?? res?.tools ?? []
}

async function mcpCallTool(name: string, args: Record<string, unknown>): Promise<string> {
	const res = await mcpRequest('tools/call', { name, arguments: args })
	const content = res?.result?.content ?? res?.content ?? []
	return content.map((c: any) => c.text ?? JSON.stringify(c)).join('\n')
}

export const McpQuery = () => {
	const [open, setOpen] = useState(false)
	const [tools, setTools] = useState<McpTool[]>([])
	const [selectedToolName, setSelectedToolName] = useState<string>('')
	const [paramValues, setParamValues] = useState<Record<string, string>>({})
	const [messages, setMessages] = useState<Message[]>([])
	const [loading, setLoading] = useState(false)
	const [initialized, setInitialized] = useState(false)
	const messagesEndRef = useRef<HTMLDivElement>(null)

	const selectedTool = tools.find(t => t.name === selectedToolName) ?? null

	useEffect(() => {
		messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
	}, [messages])

	const handleOpen = async (isOpen: boolean) => {
		setOpen(isOpen)
		if (isOpen && !initialized) {
			try {
				await mcpInitialize()
				const toolList = await mcpListTools()
				setTools(toolList)
				setInitialized(true)
			} catch (err) {
				console.error('[MCP] Connection error:', err)
				setMessages([{ role: 'assistant', content: 'Failed to connect to MCP server.' }])
			}
		}
	}

	const handleSelectTool = (value: string) => {
		setSelectedToolName(value)
		setParamValues({})
	}

	const handleExecute = async () => {
		if (!selectedTool) return
		setLoading(true)

		const args: Record<string, unknown> = {}
		const props = selectedTool.inputSchema?.properties ?? {}
		for (const [key, schema] of Object.entries(props) as [string, any][]) {
			const raw = paramValues[key]
			if (raw === undefined || raw === '') continue
			if (schema.type === 'number' || schema.type === 'integer') {
				args[key] = Number(raw)
			} else if (schema.type === 'array') {
				try {
					args[key] = JSON.parse(raw)
				} catch {
					args[key] = raw.split(',').map(s => s.trim())
				}
			} else if (schema.type === 'object') {
				try {
					args[key] = JSON.parse(raw)
				} catch {
					args[key] = raw
				}
			} else {
				args[key] = raw
			}
		}

		setMessages(prev => [
			...prev,
			{ role: 'user', content: `${selectedTool.name}(${JSON.stringify(args)})` }
		])

		try {
			const result = await mcpCallTool(selectedTool.name, args)
			setMessages(prev => [...prev, { role: 'assistant', content: result }])
		} catch (err: any) {
			setMessages(prev => [
				...prev,
				{ role: 'assistant', content: `Error: ${err.message ?? 'Unknown error'}` }
			])
		}

		setLoading(false)
		setSelectedToolName('')
		setParamValues({})
	}

	const allParams = selectedTool
		? [
				...Object.entries(selectedTool.inputSchema?.properties ?? {}).filter(([key]) =>
					(selectedTool.inputSchema?.required ?? []).includes(key)
				),
				...Object.entries(selectedTool.inputSchema?.properties ?? {}).filter(
					([key]) => !(selectedTool.inputSchema?.required ?? []).includes(key)
				)
			]
		: []

	return (
		<Drawer open={open} onOpenChange={handleOpen}>
			<Drawer.Trigger asChild>
				<Button size="small">
					<ChatBubbleLeftRight className="mr-1" />
					Query Data
				</Button>
			</Drawer.Trigger>
			<Drawer.Content>
				<Drawer.Header>
					<Drawer.Title>Query Data</Drawer.Title>
					<Drawer.Description>
						Run queries against your store data using MCP tools.
					</Drawer.Description>
				</Drawer.Header>
				<Drawer.Body className="flex flex-col gap-4 overflow-hidden">
					{/* Tool selector */}
					<div className="flex flex-col gap-2">
						<Select value={selectedToolName} onValueChange={handleSelectTool}>
							<Select.Trigger>
								<Select.Value placeholder="Select a tool..." />
							</Select.Trigger>
							<Select.Content>
								{tools.map(tool => (
									<Select.Item key={tool.name} value={tool.name}>
										{tool.name}
									</Select.Item>
								))}
							</Select.Content>
						</Select>

						{selectedTool && (
							<>
								<Text size="xsmall" className="text-ui-fg-subtle">
									{selectedTool.description}
								</Text>
								<div className="flex flex-wrap gap-2 items-end">
									{allParams.map(([key, schema]: [string, any]) => (
										<div key={key} className="flex flex-col gap-0.5">
											<Text size="xsmall" className="text-ui-fg-subtle">
												{key}
												{(selectedTool.inputSchema?.required ?? []).includes(key)
													? ' *'
													: ''}
											</Text>
											<Input
												size="small"
												placeholder={schema.description ?? key}
												value={paramValues[key] ?? ''}
												onChange={e =>
													setParamValues(prev => ({ ...prev, [key]: e.target.value }))
												}
											/>
										</div>
									))}
									<Button size="small" onClick={handleExecute} disabled={loading}>
										Run
									</Button>
								</div>
							</>
						)}
					</div>

					{/* Messages */}
					<div className="flex-1 overflow-y-auto flex flex-col gap-2 min-h-0">
						{messages.map((msg, i) =>
							msg.role === 'user' ? (
								<div
									key={i}
									className="max-w-[90%] self-end rounded-lg px-3 py-2 text-xs bg-ui-bg-subtle text-ui-fg-base"
								>
									<pre className="whitespace-pre-wrap font-mono break-all">
										{msg.content}
									</pre>
								</div>
							) : (
								<div key={i} className="self-start w-full">
									<CodeBlock
										snippets={[
											{
												label: 'Result',
												language: 'json',
												code: msg.content,
												hideLineNumbers: true
											}
										]}
									>
										{/* <CodeBlock.Header /> */}
										<CodeBlock.Body className="text-xs [&_code]:text-xs" />
									</CodeBlock>
								</div>
							)
						)}
						{loading && (
							<Text size="xsmall" className="text-ui-fg-muted">
								Running...
							</Text>
						)}
						<div ref={messagesEndRef} />
					</div>
				</Drawer.Body>
			</Drawer.Content>
		</Drawer>
	)
}
