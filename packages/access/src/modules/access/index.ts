import { Module } from "@medusajs/framework/utils"
import { AccessModuleService } from "./services"
import initialDataLoader from "./loaders/initial-data"

export const ACCESS_MODULE = "access"

export default Module(ACCESS_MODULE, {
  service: AccessModuleService,
  loaders: [initialDataLoader],
})
