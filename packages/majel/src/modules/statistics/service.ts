import { MedusaService } from '@medusajs/framework/utils'
import { StatisticsDaily } from './models/statistics-daily'

export class StatisticsService extends MedusaService({ StatisticsDaily }) {}
