import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js'
import { MedusaContainer } from '@medusajs/framework/types'

export function registerStatisticsTools(
	_server: McpServer,
	_scope: MedusaContainer,
	_moduleKey: string
): void {
	// Future: register tools that query statistics_daily data
	// e.g. get_revenue_trend, get_order_stats, compare_periods
	// These tools will return structured data that the chat UI
	// can render as Recharts charts.
}
