import { model } from "@medusajs/framework/utils"
import AccessRoleParent from "./access-role-parent"
import AccessRolePolicy from "./access-role-policy"

const AccessRole = model
  .define("access_role", {
    id: model.id({ prefix: "acrl" }).primaryKey(),
    name: model.text().searchable(),
    description: model.text().nullable(),
    metadata: model.json().nullable(),
    policies: model.hasMany(() => AccessRolePolicy, { mappedBy: "role" }),
    parents: model.hasMany(() => AccessRoleParent, { mappedBy: "role" }),
  })
  .indexes([
    { on: ["name"], unique: true, where: "deleted_at IS NULL" },
  ])

export default AccessRole
