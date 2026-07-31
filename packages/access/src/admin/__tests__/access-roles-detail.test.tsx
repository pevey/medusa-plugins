import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { page } from 'vitest/browser'
import { renderAdminRoute } from 'medusa-admin-test-utils'
import { installFake, makeAccessRole, makeAccessPolicy, makeAccessRolePolicy, makeAccessRoleUser } from './setup.js'

const policies = [makeAccessPolicy(), makeAccessPolicy({ id: 'accpolicy_2', key: 'order:write', resource: 'order', operation: 'write' })]

const detailResponders = (role = makeAccessRole(), rolePolicies = [makeAccessRolePolicy()], roleUsers = [makeAccessRoleUser()]) => ({
	'GET /admin/access/roles/:id': () => ({ role }),
	'GET /admin/access/roles/:id/policies': () => ({ policies: rolePolicies, count: rolePolicies.length, limit: 200, offset: 0 }),
	'GET /admin/access/roles/:id/users': () => ({ users: roleUsers, count: roleUsers.length, limit: 200, offset: 0 }),
	// Both of these are only actually fetched once the corresponding drawer/modal opens (see
	// `manage-role-permissions-drawer.tsx`/`add-role-users-modal.tsx`), but are supplied
	// unconditionally here since `add-role-users-modal.tsx`'s own `useUsersList` call is NOT
	// gated on `open` -- it fires as soon as the detail page mounts.
	'GET /admin/access/policies': () => ({ policies, count: policies.length, limit: 10, offset: 0 }),
	// `/admin/users` is a core Medusa route this plugin doesn't own -- see the synthetic contract
	// registered for it in `setup.ts`.
	'GET /admin/users': () => ({
		users: [{ id: 'user_2', email: 'bob@example.com', first_name: 'Bob', last_name: 'Smith' }],
		count: 1,
		limit: 10,
		offset: 0
	}),
	'POST /admin/access/roles/:id/policies': () => ({ policies: [] }),
	'POST /admin/access/roles/:id/users': () => ({ users: [] }),
	'DELETE /admin/access/roles/:id': () => ({ id: role.id, object: 'access_role', deleted: true })
})

const mount = async (role = makeAccessRole(), rolePolicies = [makeAccessRolePolicy()], roleUsers = [makeAccessRoleUser()]) => {
	const fake = installFake(detailResponders(role, rolePolicies, roleUsers))
	const { default: RoleDetailPage } = await import('../routes/settings/access-roles/[id]/page')
	const result = renderAdminRoute(RoleDetailPage, {
		initialPath: `/settings/access-roles/${role.id}`,
		routePath: '/settings/access-roles/:id'
	})
	return { fake, ...result }
}

beforeEach(() => {
	vi.resetModules()
})

afterEach(() => {
	vi.doUnmock('../lib/sdk')
})

describe('access role detail view', () => {
	it('renders the fields the detail route returns, including the flattened policy and the narrowed user projection', async () => {
		await mount()
		await expect.element(page.getByRole('heading', { name: 'Support Agent' })).toBeInTheDocument()
		await expect.element(page.getByText('Handles customer support tickets.')).toBeInTheDocument()

		// Live bug fix #1 pin: `roles/[id]/policies/route.ts` now flattens the
		// `access_role_policy` join's `policy` belongs-to relation down to a bare permission-key
		// string (`flattenPolicy`) before responding. The page renders `{p.policy}` directly
		// (`<Badge key={p.id}>{p.policy}</Badge>`) -- with the pre-fix raw `{ id }` relation stub
		// this crashed with "objects are not valid as a React child". Asserting the flattened
		// string actually renders pins the fix end-to-end.
		await expect.element(page.getByText('product:read')).toBeInTheDocument()

		// Live bug fix #2 pin: `roles/[id]/users/route.ts` now returns a 4-field projection
		// (id/email/first_name/last_name), not the full raw `AdminUser` row. `makeAccessRoleUser()`
		// models exactly that narrowed shape; the page reading `u.first_name`/`u.last_name`/
		// `u.email` off of it renders correctly.
		await expect.element(page.getByText('Jane Doe')).toBeInTheDocument()
		await expect.element(page.getByText('jane@example.com')).toBeInTheDocument()
	})

	it('posts a policies body the AdminAddRolePolicies validator accepts via the permissions drawer', async () => {
		const { fake } = await mount()
		await expect.element(page.getByRole('heading', { name: 'Support Agent' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'Manage' }).click()
		await expect.element(page.getByText('order:write')).toBeInTheDocument()

		// Row 0 is the header "select all" checkbox; row 1 (product:read) is already seeded and
		// checked from the role's current policies; row 2 (order:write) is the one being newly
		// granted.
		await page.getByRole('checkbox').nth(2).click()
		await page.getByRole('button', { name: 'Save' }).click()

		// `fake.calls` is recorded before validation, so gate on the toast -- the drawer only
		// calls `setOpen(false)` inside `handleSave`'s try block, after the mutation resolves.
		await expect.element(page.getByText('Permissions updated successfully')).toBeInTheDocument()

		// `product:read` (already selected) is untouched -- only the newly-checked policy is sent.
		const add = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/access/roles/accrole_1/policies')
		expect(add?.body).toEqual({ policies: ['accpolicy_2'] })
	})

	it('posts a users body the AdminAssignRoleUsers validator accepts via the add-users modal', async () => {
		const { fake } = await mount()
		await expect.element(page.getByRole('heading', { name: 'Support Agent' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'Add' }).click()
		await expect.element(page.getByText('bob@example.com')).toBeInTheDocument()

		// Row 0 is the header "select all" checkbox; row 1 is the fixture's one core-user search
		// result, which is not already assigned to the role (`alreadyAssigned` only contains
		// `user_1`, the role's existing user).
		await page.getByRole('checkbox').nth(1).click()
		await page.getByRole('button', { name: 'Save' }).click()

		// Gate on the toast -- `handleSave` only calls `setOpen(false)` inside the mutation's
		// `onSuccess`.
		await expect.element(page.getByText('Users added to role')).toBeInTheDocument()

		const assign = fake.calls.find(call => call.method === 'POST' && call.path === '/admin/access/roles/accrole_1/users')
		expect(assign?.body).toEqual({ users: ['user_2'] })
	})

	it('navigates back to the in-app list path after delete', async () => {
		// `/settings/access-roles`, not `/app/settings/access-roles` -- Medusa mounts the
		// dashboard under a configurable `admin.path`, and React Router supplies that as the
		// router basename, so plugin code navigates with the bare in-app path.
		const result = await mount()
		await expect.element(page.getByRole('heading', { name: 'Support Agent' })).toBeInTheDocument()

		await page.getByRole('button', { name: 'More actions' }).click()
		await page.getByRole('menuitem', { name: 'Delete' }).click()
		// Only the confirm dialog's Delete button is present now -- Radix marks the rest of the
		// page `aria-hidden` while the (modal) AlertDialog is open.
		await page.getByRole('button', { name: 'Delete' }).click()

		await vi.waitFor(() => expect(result.navigations).toContain('/settings/access-roles'))
	})
})
