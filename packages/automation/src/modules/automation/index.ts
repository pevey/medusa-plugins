import { Module } from '@medusajs/framework/utils'
import { AutomationService } from './service'

export const AUTOMATION_MODULE = 'automation'

export default Module(AUTOMATION_MODULE, {
	service: AutomationService
})

export * from './service'
