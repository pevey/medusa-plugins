import { OpenAiProvider } from './openai'

export class OllamaProvider extends OpenAiProvider {
	constructor(model: string, baseUrl: string) {
		// Ollama exposes an OpenAI-compatible API — no API key needed
		super(model, 'ollama', baseUrl)
	}
}
