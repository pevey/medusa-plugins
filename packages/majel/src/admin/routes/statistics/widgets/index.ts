import { ComponentType } from 'react'
import { RevenueWidget } from './revenue-widget'
import { OrdersCountWidget } from './orders-count-widget'
import { AovWidget } from './aov-widget'
import { TopProductsWidget } from './top-products-widget'
import { RecentOrdersWidget } from './recent-orders-widget'
import { CustomerCountWidget } from './customer-count-widget'
import { FulfillmentWidget } from './fulfillment-widget'
import { LowStockWidget } from './low-stock-widget'

export interface WidgetProps {
	statistics: any[]
	totals: Record<string, any>
	period: string
}

type LayoutDef = { x: number; y: number; w: number; h: number; minW?: number; minH?: number }

export interface StatisticsWidget {
	id: string
	title: string
	layouts: {
		lg: LayoutDef
		md: LayoutDef
		sm: LayoutDef
	}
	component: ComponentType<WidgetProps>
}

export const WIDGETS: StatisticsWidget[] = [
	{
		id: 'revenue',
		title: 'Revenue',
		layouts: {
			lg: { x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
			md: { x: 0, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
			sm: { x: 0, y: 0, w: 4, h: 3, minW: 2, minH: 2 }
		},
		component: RevenueWidget
	},
	{
		id: 'orders',
		title: 'Orders',
		layouts: {
			lg: { x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
			md: { x: 4, y: 0, w: 4, h: 3, minW: 3, minH: 2 },
			sm: { x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 2 }
		},
		component: OrdersCountWidget
	},
	{
		id: 'aov',
		title: 'Avg Order Value',
		layouts: {
			lg: { x: 8, y: 0, w: 4, h: 3, minW: 2, minH: 2 },
			md: { x: 0, y: 3, w: 4, h: 3, minW: 2, minH: 2 },
			sm: { x: 0, y: 6, w: 4, h: 3, minW: 2, minH: 2 }
		},
		component: AovWidget
	},
	{
		id: 'top-products',
		title: 'Top Products',
		layouts: {
			lg: { x: 0, y: 3, w: 4, h: 4, minW: 3, minH: 3 },
			md: { x: 4, y: 3, w: 4, h: 3, minW: 3, minH: 3 },
			sm: { x: 0, y: 9, w: 4, h: 4, minW: 2, minH: 3 }
		},
		component: TopProductsWidget
	},
	{
		id: 'recent-orders',
		title: 'Recent Orders',
		layouts: {
			lg: { x: 4, y: 3, w: 8, h: 4, minW: 4, minH: 3 },
			md: { x: 0, y: 6, w: 8, h: 4, minW: 4, minH: 3 },
			sm: { x: 0, y: 13, w: 4, h: 4, minW: 2, minH: 3 }
		},
		component: RecentOrdersWidget
	},
	{
		id: 'customers',
		title: 'Customers',
		layouts: {
			lg: { x: 0, y: 7, w: 3, h: 3, minW: 2, minH: 2 },
			md: { x: 0, y: 10, w: 4, h: 3, minW: 2, minH: 2 },
			sm: { x: 0, y: 17, w: 4, h: 3, minW: 2, minH: 2 }
		},
		component: CustomerCountWidget
	},
	{
		id: 'fulfillment',
		title: 'Pending Fulfillment',
		layouts: {
			lg: { x: 3, y: 7, w: 3, h: 3, minW: 2, minH: 2 },
			md: { x: 4, y: 10, w: 4, h: 3, minW: 2, minH: 2 },
			sm: { x: 0, y: 20, w: 4, h: 3, minW: 2, minH: 2 }
		},
		component: FulfillmentWidget
	},
	{
		id: 'low-stock',
		title: 'Low Stock',
		layouts: {
			lg: { x: 6, y: 7, w: 6, h: 3, minW: 4, minH: 2 },
			md: { x: 0, y: 13, w: 8, h: 3, minW: 4, minH: 2 },
			sm: { x: 0, y: 23, w: 4, h: 3, minW: 2, minH: 2 }
		},
		component: LowStockWidget
	}
]
