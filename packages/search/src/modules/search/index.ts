import { Module } from '@medusajs/framework/utils'
import SearchModuleService from './service'
import seedIfEmptyLoader from './loaders/seed-if-empty'

export const SEARCH_MODULE = 'search'

export default Module(SEARCH_MODULE, {
	service: SearchModuleService,
	loaders: [seedIfEmptyLoader]
})
