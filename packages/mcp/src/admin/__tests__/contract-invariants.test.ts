import { describe, it, expect } from 'vitest'
import { assertContractInvariants } from 'medusa-admin-test-utils'
import * as validators from '../../api/validators'
import { contracts } from './setup.js'

describe('mcp admin ↔ api contract', () => {
	it('holds every static invariant', () => {
		expect(() =>
			assertContractInvariants({
				contracts,
				validators
				// No `declaredFields` entries: this plugin's only wired route is `POST /admin/chat`
				// (a body-only mutation, no `queryConfig`). Every GET the admin chat UI reads
				// (`/admin/chat/sessions`, `/admin/chat/sessions/:id`) has no `middlewares.ts` entry
				// at all — the handlers hand-build their JSON responses without
				// `validateAndTransformQuery` — so there is no `queryConfig.defaults` for the
				// field-subset invariant to check against. An empty map here is correct, not a
				// shortcut (same as veeqo's legitimately-empty map).
			})
		).not.toThrow()
	})
})
