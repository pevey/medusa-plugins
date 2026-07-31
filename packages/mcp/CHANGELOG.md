## 0.4.0

- Added MCP v2 support

## 0.3.0

- Added registry API for plugins and extensions to register their own tools
- Added option to prevent write tool access with default to not allowed
- Dropped ollama provider. Ollama users should configure as OpenAI. See Readme example.
- Improved chat UX

## 0.2.2

- Updated medusa packages to 2.17.2
- Migrated all integration tests to work with changes introduced in @medusajs/test-utils 2.17.0

## 0.2.1

- Upgrade underlying Medusa packages

## 0.2.0

- BREAKING CHANGE: Updated medusa peer dependencies to ^2.14
  Requires that your backend project is using zod v4
