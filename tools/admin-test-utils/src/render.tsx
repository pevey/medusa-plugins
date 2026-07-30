import { useEffect, type ComponentType } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { createMemoryRouter, RouterProvider, useLocation } from 'react-router-dom'
import { Toaster, TooltipProvider } from '@medusajs/ui'
import { render } from 'vitest-browser-react'

export type RenderAdminRouteOptions = {
	/** The URL the router starts at. Defaults to '/'. */
	initialPath?: string
	/** The route pattern the component is mounted at, e.g. '/reviews/:id'. Defaults to '*'. */
	routePath?: string
}

export type RenderAdminRouteResult = {
	/** Every path the component navigated to, in order. */
	navigations: string[]
}

export function renderAdminRoute(
	Component: ComponentType,
	options: RenderAdminRouteOptions = {}
): RenderAdminRouteResult {
	const navigations: string[] = []
	const initialPath = options.initialPath ?? '/'

	const Tracker = () => {
		const location = useLocation()
		useEffect(() => {
			const path = `${location.pathname}${location.search}`
			if (path !== initialPath) navigations.push(path)
		}, [location])
		return null
	}

	const Wrapped = () => (
		<>
			<Tracker />
			<Component />
		</>
	)

	// A data router (createMemoryRouter) is required: forms' modals call useBlocker,
	// which throws under the non-data MemoryRouter.
	const router = createMemoryRouter(
		[
			{ path: options.routePath ?? '*', element: <Wrapped /> },
			{ path: '*', element: <Wrapped /> }
		],
		{ initialEntries: [initialPath] }
	)

	// retry off: a contract violation should surface as one failed request, not three.
	const queryClient = new QueryClient({
		defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
	})

	// TooltipProvider is not optional decoration: the real dashboard wraps the app in it, and
	// @medusajs/ui's DataTable reaches for it internally — its filter menu and command bar render
	// Tooltips, which throw "`Tooltip` must be used within `TooltipProvider`" on mount without it.
	// Every provider the real admin supplies has to be here, or a component that works in the
	// dashboard fails in the harness for reasons that have nothing to do with the plugin.
	render(
		<QueryClientProvider client={queryClient}>
			<TooltipProvider>
				{/* v7_startTransition: silences react-router's future-flag deprecation warning.
				    No behavioral effect on the tests this harness runs. */}
				<RouterProvider router={router} future={{ v7_startTransition: true }} />
				<Toaster />
			</TooltipProvider>
		</QueryClientProvider>
	)

	return { navigations }
}
