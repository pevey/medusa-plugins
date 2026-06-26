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
	AdminGetComplaintTag,
	AdminGetComplaintTags,
	AdminUpdateComplaint,
	AdminUpdateComplaintActivity,
	AdminUpdateComplaintTag,
	AdminCreateComplaintTag,
	AdminCreateComplaintNote,
	AdminUpdateComplaintNote
} from './validators'

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
					'id', 'number', 'status', 'description', 'created_at', 'updated_at',
					'customer_id', 'order_id', 'product_id', 'stock_lot_id', 'serial_number_id', 'tags.*'
				],
				isList: true,
				defaultLimit: 20
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
		matcher: '/admin/complaints/:id',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaint, {
				defaults: [
					'id', 'number', 'status', 'description', 'created_at', 'updated_at',
					'customer_id', 'order_id', 'product_id', 'stock_lot_id', 'serial_number_id',
					'tags.*', 'customer.*', 'order.*', 'product.*'
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
				defaultLimit: 20
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
				defaults: [
					'id', 'complaint_id', 'user_id', 'type', 'note', 'metadata',
					'created_at', 'updated_at', 'user.*'
				],
				isList: true,
				defaultLimit: 20
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
				defaults: [
					'id', 'complaint_id', 'user_id', 'type', 'note', 'metadata',
					'created_at', 'updated_at', 'user.*'
				],
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
				defaults: [
					'product_id', 'total_complaints', 'total_orders', 'complaint_rate', 'last_calculated_at'
				],
				isList: false
			})
		]
	},
	{
		matcher: '/admin/complaints/:id/documents',
		method: ['GET'],
		middlewares: [
			validateAndTransformQuery(AdminGetComplaintDocuments, {
				defaults: [
					'id', 'complaint_id', 'filename', 'mime_type', 'size_bytes',
					'uploaded_by', 'created_at'
				],
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
