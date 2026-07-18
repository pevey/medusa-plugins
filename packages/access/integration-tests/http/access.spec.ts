import { medusaIntegrationTestRunner } from "@medusajs/test-utils"
import {
  ContainerRegistrationKeys,
  Modules,
} from "@medusajs/framework/utils"
import { createUserAccountWorkflow } from "@medusajs/medusa/core-flows"
import {
  hasPermission,
  resolvePermissions,
} from "../../src/utils"
import {
  createAccessPoliciesWorkflow,
  createAccessRolePoliciesWorkflow,
  createAccessRolesWorkflow,
  deleteAccessRolesWorkflow,
} from "../../.medusa/server/src/workflows/access/workflows"

jest.setTimeout(120 * 1000)
jest.retryTimes(1)

medusaIntegrationTestRunner({
  dbName: "medusa-access",
  inApp: true,
  env: {},
  testSuite: ({ getContainer, dbUtils, utils }) => {
    describe("access links", () => {
      it("links a user to an access role and resolves it via graph query", async () => {
        const container = getContainer()
        const accessService: any = container.resolve("access")
        const link = container.resolve(ContainerRegistrationKeys.LINK)
        const query = container.resolve(ContainerRegistrationKeys.QUERY)

        // 1) create an access role
        const role = await accessService.createAccessRoles({ name: "Manager" })

        // 2) create a user
        const authService: any = container.resolve(Modules.AUTH)
        const { authIdentity } = await authService.register("emailpass", {
          body: { email: "link-test@example.com", password: "Sup3rSecret!" },
        })
        const { result: user } = await createUserAccountWorkflow(container).run({
          input: {
            authIdentityId: authIdentity!.id,
            userData: {
              email: "link-test@example.com",
              first_name: "Link",
              last_name: "Tester",
            },
          },
        })

        // 3) create the link (user <-> access_role)
        await (link as any).create({
          [Modules.USER]: { user_id: user.id },
          access: { access_role_id: role.id },
        })

        // 4) resolve the role back through the user via graph
        const { data } = await (query as any).graph({
          entity: "user",
          fields: ["id", "access_roles.id", "access_roles.name"],
          filters: { id: user.id },
        })

        expect(data).toHaveLength(1)
        const roleIds = (data[0].access_roles ?? []).map((r: any) => r.id)
        expect(roleIds).toContain(role.id)
      })
    })

    describe("hasPermission", () => {
      it("grants exact actions, denies others", async () => {
        const container = getContainer()
        const accessService: any = container.resolve("access")

        const role = await accessService.createAccessRoles({
          name: "ProductReader",
        })
        const policy = await accessService.createAccessPolicies({
          key: "product:read",
          resource: "product",
          operation: "read",
          name: "ReadProduct",
        })
        await accessService.createAccessRolePolicies({
          role_id: role.id,
          policy_id: policy.id,
        })

        await expect(
          hasPermission({
            roles: [role.id],
            actions: { resource: "product", operation: "read" },
            container,
          })
        ).resolves.toBe(true)

        await expect(
          hasPermission({
            roles: [role.id],
            actions: { resource: "product", operation: "delete" },
            container,
          })
        ).resolves.toBe(false)
      })

      it("super admin (*:*) grants everything; resolvePermissions expands the universe", async () => {
        const container = getContainer()

        // the module's initial-data loader seeds acrl_super_admin with a *:* policy
        await expect(
          hasPermission({
            roles: ["acrl_super_admin"],
            actions: { resource: "order", operation: "delete" },
            container,
          })
        ).resolves.toBe(true)

        const granted = await resolvePermissions({
          roles: ["acrl_super_admin"],
          universe: [
            { resource: "order", operation: "delete" },
            { resource: "product", operation: "read" },
          ],
          container,
        })
        expect(granted.has("order:delete")).toBe(true)
        expect(granted.has("product:read")).toBe(true)
      })
    })

    describe("rbac CRUD workflows", () => {
      it("creates policies + a role linked to them, then deletes the role", async () => {
        const container = getContainer()
        const accessService: any = container.resolve("access")

        const { result: createdPolicies } = await createAccessPoliciesWorkflow(
          container
        ).run({
          input: {
            policies: [
              {
                key: "widget:read",
                resource: "widget",
                operation: "read",
                name: "ReadWidget",
              },
            ],
          },
        })
        const policyId = createdPolicies[0].id

        expect(policyId).toBeTruthy()

        // bare role create (no nested policy linking) to isolate transaction behavior
        const { result: createdRoles } = await createAccessRolesWorkflow(
          container
        ).run({
          input: { roles: [{ name: "WidgetViewer" }] },
        })
        const roleId = createdRoles[0].id
        expect(roleId).toBeTruthy()

        const [beforeDelete] = await accessService.listAccessRoles({
          id: roleId,
        })
        expect(beforeDelete?.name).toBe("WidgetViewer")

        await deleteAccessRolesWorkflow(container).run({
          input: { ids: [roleId] },
        })
        const after = await accessService.listAccessRoles({ id: roleId })
        expect(after).toHaveLength(0)
      })

      it("nested: creates a role WITH policies in one workflow call", async () => {
        // The 2.17 DB-templating restore can leave workflow steps on divergent
        // connections (write-step vs read-step see different DB state); re-capturing
        // the template stabilizes the connection for this test. See memory:
        // project_test_utils_pk_seeding.
        await utils.waitWorkflowExecutions()
        await dbUtils.snapshot()

        const container = getContainer()
        const accessService: any = container.resolve("access")

        const { result: createdPolicies } = await createAccessPoliciesWorkflow(
          container
        ).run({
          input: {
            policies: [
              {
                key: "gizmo:read",
                resource: "gizmo",
                operation: "read",
                name: "ReadGizmo",
              },
            ],
          },
        })

        const { result: createdRoles } = await createAccessRolesWorkflow(
          container
        ).run({
          input: {
            roles: [
              { name: "GizmoViewer", policy_ids: [createdPolicies[0].id] },
            ],
          },
        })

        const rolePolicies = await accessService.listPoliciesForRole(
          createdRoles[0].id
        )
        expect(rolePolicies.map((p: any) => p.key)).toContain("gizmo:read")
      })

      it("links a policy to a pre-existing role via the role-policies workflow", async () => {
        const container = getContainer()
        const accessService: any = container.resolve("access")

        const role = await accessService.createAccessRoles({ name: "Linker" })
        const policy = await accessService.createAccessPolicies({
          key: "gadget:read",
          resource: "gadget",
          operation: "read",
          name: "ReadGadget",
        })

        await createAccessRolePoliciesWorkflow(container).run({
          input: { policies: [{ role_id: role.id, policy_id: policy.id }] },
        })

        const rolePolicies = await accessService.listPoliciesForRole(role.id)
        expect(rolePolicies.map((p: any) => p.key)).toContain("gadget:read")
      })
    })
  },
})
