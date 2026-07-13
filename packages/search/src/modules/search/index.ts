import { Module } from '@medusajs/framework/utils'
import SearchModuleService from './service'

export const SEARCH_MODULE = 'search'

export default Module(SEARCH_MODULE, {
	service: SearchModuleService
})
