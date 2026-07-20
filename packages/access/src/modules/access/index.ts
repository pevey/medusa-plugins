import { Module } from '@medusajs/framework/utils'
import { AccessModuleService } from './service'
import initialDataLoader from './loaders/initial-data'
import policiesLoader from './loaders/policies'

export const ACCESS_MODULE = 'access'

export default Module(ACCESS_MODULE, {
	service: AccessModuleService,
	loaders: [policiesLoader, initialDataLoader]
})
