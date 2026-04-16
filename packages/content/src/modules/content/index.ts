import { Module } from '@medusajs/framework/utils'
import { ContentService } from './service'

export const CONTENT_MODULE = 'content'

export default Module(CONTENT_MODULE, {
	service: ContentService
})

export * from './service'
