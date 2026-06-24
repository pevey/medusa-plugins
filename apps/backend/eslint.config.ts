import { defineConfig } from "eslint/config"
import medusa from "@medusajs/eslint-plugin"

export default defineConfig([
	...medusa.configs.recommended,
	{
		ignores: [
			"src/api/admin/workflows/tiered-pricing/route.ts",
			"src/subscribers/email-attachment.ts"
		]
	}
])
