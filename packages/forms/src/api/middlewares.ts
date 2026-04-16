import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import {
	AdminCreateForm,
	AdminCreateFormField,
	AdminCreateFormFieldOption,
	AdminDeleteFormFieldOptions,
	AdminDeleteFormFields,
	AdminDeleteForms,
	AdminDeleteFormSubmissions,
	AdminGetForm,
	AdminGetFormFields,
	AdminGetForms,
	AdminGetFormSubmission,
	AdminGetFormSubmissions,
	AdminUpdateForm,
	AdminUpdateFormField,
	AdminUpdateFormFieldOption,
	AdminUpdateFormSubmission,
	StoreSubmitForm
} from './validators'

export default defineMiddlewares([
	{
		matcher: '/admin/forms',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetForms, {
				defaults: [
					'id', 'name', 'handle', 'description', 'active', 'turnstile_enabled',
					'notification_emails', 'metadata', 'created_at', 'updated_at', 'form_fields.id'
				],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/admin/forms',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateForm)]
	},
	{
		matcher: '/admin/forms',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteForms)]
	},
	{
		matcher: '/admin/forms/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetForm, {
				defaults: [
					'id', 'name', 'handle', 'description', 'active', 'turnstile_enabled',
					'notification_emails', 'metadata', 'created_at', 'updated_at',
					'form_fields.id', 'form_fields.name', 'form_fields.label',
					'form_fields.field_type', 'form_fields.required', 'form_fields.sort_order',
					'form_fields.field_options.id', 'form_fields.field_options.label',
					'form_fields.field_options.value', 'form_fields.field_options.sort_order'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/forms/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateForm)]
	},
	{
		matcher: '/admin/forms/:id/fields',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetFormFields, {
				defaults: [
					'id', 'name', 'label', 'field_type', 'required', 'options', 'sort_order',
					'created_at', 'updated_at'
				],
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/admin/forms/:id/fields',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateFormField)]
	},
	{
		matcher: '/admin/forms/:id/fields',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteFormFields)]
	},
	{
		matcher: '/admin/forms/:id/fields/:fieldId',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateFormField)]
	},
	{
		matcher: '/admin/forms/:id/fields/:fieldId/options',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateFormFieldOption)]
	},
	{
		matcher: '/admin/forms/:id/fields/:fieldId/options',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteFormFieldOptions)]
	},
	{
		matcher: '/admin/forms/:id/fields/:fieldId/options/:optionId',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateFormFieldOption)]
	},
	{
		matcher: '/admin/form-submissions',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetFormSubmissions, {
				defaults: [
					'id', 'status', 'data', 'ip_address', 'user_agent', 'created_at', 'updated_at',
					'form.id', 'form.name', 'form.handle'
				],
				isList: true,
				defaultLimit: 20
			})
		]
	},
	{
		matcher: '/admin/form-submissions',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteFormSubmissions)]
	},
	{
		matcher: '/admin/form-submissions/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetFormSubmission, {
				defaults: [
					'id', 'status', 'data', 'ip_address', 'user_agent', 'created_at', 'updated_at',
					'form.id', 'form.name', 'form.handle',
					'form.form_fields.id', 'form.form_fields.name',
					'form.form_fields.label', 'form.form_fields.field_type'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/form-submissions/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateFormSubmission)]
	},
	// Store
	{
		matcher: '/forms/:handle',
		method: ['POST'],
		middlewares: [validateAndTransformBody(StoreSubmitForm)]
	}
])
