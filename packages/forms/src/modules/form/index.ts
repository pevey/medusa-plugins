import { Module } from '@medusajs/framework/utils'
import { FormService } from './service'

export const FORM_MODULE = 'form'

export default Module(FORM_MODULE, { service: FormService })

export * from './service'
