import { Module } from '@medusajs/framework/utils'
import { MildredService } from './service'

export const MILDRED_MODULE = 'mildred'

export default Module(MILDRED_MODULE, {
	service: MildredService
})
