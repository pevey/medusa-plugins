import { Module } from '@medusajs/framework/utils'
import { VeeqoService } from './service'

export const VEEQO_MODULE = 'veeqo'

export default Module(VEEQO_MODULE, {
	service: VeeqoService
})
