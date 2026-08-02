import multer from 'multer'
import { defineMiddlewares, validateAndTransformBody, validateAndTransformQuery } from '@medusajs/framework/http'
import { COMPLAINT_MODULE } from '../modules/complaint'
import { ComplaintService } from '../modules/complaint/service'
import { DEFAULT_COMPLAINT_DOCUMENT_MAX_BYTES } from '../modules/complaint/types'
import {
	AdminCreateComplaint,
	AdminCreateComplaintActivity,
	AdminDeleteComplaintActivities,
	AdminDeleteComplaints,
	AdminDeleteComplaintTags,
	AdminGetComplaint,
	AdminGetComplaintActivities,
	AdminGetComplaintActivity,
	AdminGetComplaintDocuments,
	AdminGetComplaintProductStat,
	AdminGetComplaints,
	AdminGenerateComplaintsPdfExport,
	AdminGetComplaintTag,
	AdminGetComplaintTags,
	AdminUpdateComplaint,
	AdminUpdateComplaintActivity,
	AdminUpdateComplaintTag,
	AdminCreateComplaintTag,
	AdminCreateComplaintNote,
	AdminUpdateComplaintNote
} from './validators'

// Optional integration with medusa-plugin-access. When that plugin is
// installed we (1) declare the `complaint` resource's policies so they become
// assignable in the roles UI, and (2) gate the complaints admin routes behind
// the matching permission — the access plugin's global /admin/* guard enforces
// them. When the plugin is NOT installed, the require throws and we no-op: the
// complaints routes stay ungated. This keeps access as a soft dependency (no
// entry in package.json, no error when absent).
try {
	// `typeof import(...)` is a type-only import: it gives us full typings for
	// the access utils (so these calls are type-checked) but is erased at
	// compile time, so it adds no runtime dependency. medusa-plugin-access is
	// declared only as an OPTIONAL peer dependency.
	const { definePolicies, generateResourcePolicies, guardResource, requirePolicies, sealNamespace } = require('medusa-plugin-access') as typeof import('medusa-plugin-access')

	definePolicies(generateResourcePolicies(['complaint', 'complaint_tag', 'complaint_activity']))

	// One call per resource covers the collection AND every depth beneath it,
	// which is what the previous per-route declarations could not do: anchored
	// matchers meant `/admin/complaints/:id` never covered `/admin/complaints/:id/notes`,
	// leaving activities, documents, notes and the stats routes silently ungated.
	guardResource({ resource: 'complaint', prefix: '/admin/complaints' })
	guardResource({ resource: 'complaint_tag', prefix: '/admin/complaint-tags' })
	// Aggregates over complaints; recalculate is a POST, so it lands on complaint:update.
	guardResource({ resource: 'complaint', prefix: '/admin/complaint-stats' })

	// Activity entries are the regulatory action history. Holding complaint:update
	// should not imply the ability to rewrite or delete that history, so these
	// routes require an additional grant on top of the subtree floor (matching is
	// AND across declarations, so this is strictly stricter).
	requirePolicies({
		method: ['POST', 'DELETE'],
		matcher: '/admin/complaints/:id/activities*',
		policies: [{ resource: 'complaint_activity', operation: 'update' }]
	})

	// Fail closed for the prefixes this plugin owns: an undeclared route here is
	// an oversight, not an opt-out. The global default stays fail-open for routes
	// we do not own.
	sealNamespace('/admin/complaints')
	sealNamespace('/admin/complaint-tags')
	sealNamespace('/admin/complaint-stats')
} catch {
	// medusa-plugin-access not installed — complaints routes remain ungated.
}

const COMPLAINT_DOCUMENT_ALLOWED_MIME_TYPES = new Set([
	'application/pdf',
	'text/plain',
	'text/csv',
	'image/png',
	'image/jpeg',
	'image/gif',
	'image/webp',
	'application/zip',
	'application/x-zip-compressed'
])

export default defineMiddlewares([
	{
		matcher: '/admin/complaints',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaints, {
				defaults: [
					'id',
					'number',
					'status',
					'description',
					'created_at',
					'updated_at',
					'customer_id',
					'order_id',
					'product_id',
					'stock_lot_id',
					'serial_number_id',
					'actionable',
					'reportable',
					'tags.*'
				],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/admin/complaints',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateComplaint)]
	},
	{
		matcher: '/admin/complaints',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteComplaints)]
	},
	{
		matcher: '/admin/complaints/pdf-export',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminGenerateComplaintsPdfExport)]
	},
	{
		matcher: '/admin/complaints/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaint, {
				defaults: [
					'id',
					'number',
					'status',
					'description',
					'created_at',
					'updated_at',
					'customer_id',
					'order_id',
					'product_id',
					'stock_lot_id',
					'serial_number_id',
					'actionable',
					'reportable',
					'tags.*',
					'customer.*',
					'order.*',
					'product.*',
					'metadata'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/complaints/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateComplaint)]
	},
	{
		matcher: '/admin/complaints/:id/notes',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateComplaintNote)]
	},
	{
		matcher: '/admin/complaints/:id/notes/:note_id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateComplaintNote)]
	},
	{
		matcher: '/admin/complaint-tags',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaintTags, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/admin/complaint-tags',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateComplaintTag)]
	},
	{
		matcher: '/admin/complaint-tags',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteComplaintTags)]
	},
	{
		matcher: '/admin/complaint-tags/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaintTag, {
				defaults: ['id', 'value', 'created_at', 'updated_at'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/complaint-tags/:id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateComplaintTag)]
	},
	{
		matcher: '/admin/complaints/:id/activities',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaintActivities, {
				defaults: ['id', 'complaint_id', 'user_id', 'type', 'note', 'metadata', 'created_at', 'updated_at', 'user.*'],
				isList: true,
				defaultLimit: 15
			})
		]
	},
	{
		matcher: '/admin/complaints/:id/activities',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminCreateComplaintActivity)]
	},
	{
		matcher: '/admin/complaints/:id/activities',
		method: ['DELETE'],
		middlewares: [validateAndTransformBody(AdminDeleteComplaintActivities)]
	},
	{
		matcher: '/admin/complaints/:id/activities/:entry_id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaintActivity, {
				defaults: ['id', 'complaint_id', 'user_id', 'type', 'note', 'metadata', 'created_at', 'updated_at', 'user.*'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/complaints/:id/activities/:entry_id',
		method: ['POST'],
		middlewares: [validateAndTransformBody(AdminUpdateComplaintActivity)]
	},
	{
		matcher: '/admin/complaint-stats/products/:product_id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaintProductStat, {
				defaults: ['id', 'product_id', 'total_complaints', 'total_orders', 'complaint_rate', 'last_calculated_at'],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/complaints/:id/documents',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaintDocuments, {
				defaults: ['id', 'complaint_id', 'filename', 'mime_type', 'size_bytes', 'uploaded_by', 'created_at'],
				isList: true,
				defaultLimit: 50
			})
		]
	},
	{
		matcher: '/admin/complaints/:id/documents',
		method: ['POST'],
		middlewares: [
			(req: any, res: any, next: any) => {
				let maxBytes = DEFAULT_COMPLAINT_DOCUMENT_MAX_BYTES
				try {
					const service: ComplaintService = req.scope.resolve(COMPLAINT_MODULE)
					maxBytes = service.getMaxDocumentBytes()
				} catch {
					// Service not resolvable at this point — fall back to the
					// shipped default. This shouldn't happen in normal request
					// handling but we don't want a config-lookup failure to
					// block uploads outright.
				}
				const upload = multer({
					storage: multer.memoryStorage(),
					limits: { fileSize: maxBytes },
					fileFilter: (_req, file, cb) => {
						if (COMPLAINT_DOCUMENT_ALLOWED_MIME_TYPES.has(file.mimetype)) {
							cb(null, true)
						} else {
							cb(new Error(`Unsupported file type: ${file.mimetype}`))
						}
					}
				}).single('file')
				upload(req, res, (err: any) => {
					if (err) {
						return res.status(400).json({ type: 'invalid_data', message: err.message })
					}
					if (!req.file) {
						return res.status(400).json({ type: 'invalid_data', message: 'No file was uploaded' })
					}
					next()
				})
			}
		]
	}
])
