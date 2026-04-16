import { useRef, useState } from 'react'
import { Button } from '@medusajs/ui'
import {
	MDXEditor,
	MDXEditorMethods,
	headingsPlugin,
	diffSourcePlugin,
	directivesPlugin,
	imagePlugin,
	linkPlugin,
	linkDialogPlugin,
	listsPlugin,
	markdownShortcutPlugin,
	quotePlugin,
	tablePlugin,
	thematicBreakPlugin,
	toolbarPlugin,
	codeBlockPlugin,
	codeMirrorPlugin,
	AdmonitionDirectiveDescriptor,
	BoldItalicUnderlineToggles,
	BlockTypeSelect,
	CreateLink,
	DiffSourceToggleWrapper,
	HighlightToggle,
	InsertAdmonition,
	InsertTable,
	InsertCodeBlock,
	ListsToggle,
	Separator,
	StrikeThroughSupSubToggles,
	UndoRedo
} from '@mdxeditor/editor'
import '@mdxeditor/editor/style.css'
import { InsertImageModal } from './insert-image-modal'

type Props = {
	value: string
	onChange: (v: string) => void
	onSave: () => void
	isSaving: boolean
}

export const ContentMarkdownEditor = ({ value, onChange, onSave, isSaving }: Props) => {
	const editorRef = useRef<MDXEditorMethods>(null)
	const [galleryOpen, setGalleryOpen] = useState(false)

	const handleInsertImage = (imgHtml: string) => {
		editorRef.current?.insertMarkdown(imgHtml)
	}

	const oldValueRef = useRef(value)

	return (
		<>
			<div
				className="border-ui-border-base shadow-elevation-card-rest rounded-lg overflow-hidden isolate"
				onKeyDown={e => {
					if ((e.ctrlKey || e.metaKey) && e.key === 's') {
						e.preventDefault()
						onSave()
					}
				}}
			>
				<MDXEditor
					ref={editorRef}
					markdown={value}
					onChange={onChange}
					plugins={[
						toolbarPlugin({
							toolbarContents: () => (
								<DiffSourceToggleWrapper>
									<UndoRedo />
									<Separator />
									<BlockTypeSelect />
									<Separator />
									<BoldItalicUnderlineToggles />
									<Separator />
									<StrikeThroughSupSubToggles />
									<Separator />
									<ListsToggle />
									<Separator />
									<HighlightToggle />
									<InsertAdmonition />
									<CreateLink />
									<InsertTable />
									<InsertCodeBlock />
									<Separator />
									<Button
										size="small"
										variant="secondary"
										onClick={() => setGalleryOpen(true)}
										className="shrink-0 mr-1"
									>
										<span className="whitespace-nowrap">Insert Image</span>
									</Button>
									<div className="flex flex-grow">
										<Button
											size="small"
											onClick={onSave}
											isLoading={isSaving}
											className="ml-auto"
										>
											Save
										</Button>
									</div>
								</DiffSourceToggleWrapper>
							)
						}),
						codeBlockPlugin({ defaultCodeBlockLanguage: 'ts' }),
						codeMirrorPlugin({
							codeBlockLanguages: {
								ts: 'TypeScript',
								tsx: 'TypeScript (React)',
								js: 'JavaScript',
								jsx: 'JavaScript (React)',
								html: 'HTML',
								css: 'CSS',
								json: 'JSON',
								md: 'Markdown',
								bash: 'Bash',
								sh: 'Shell',
								sql: 'SQL',
								py: 'Python'
							}
						}),
						diffSourcePlugin({
							diffMarkdown: oldValueRef.current,
							viewMode: 'rich-text',
							readOnlyDiff: true
						}),
						directivesPlugin({ directiveDescriptors: [AdmonitionDirectiveDescriptor] }),
						headingsPlugin(),
						listsPlugin(),
						quotePlugin(),
						thematicBreakPlugin(),
						linkPlugin(),
						linkDialogPlugin(),
						tablePlugin(),
						markdownShortcutPlugin(),
						imagePlugin()
					]}
					contentEditableClassName="min-h-[50vh] px-4 py-3 prose prose-sm max-w-none focus:outline-none"
				/>
			</div>
			<InsertImageModal
				open={galleryOpen}
				onOpenChange={setGalleryOpen}
				onSelect={handleInsertImage}
			/>
		</>
	)
}
