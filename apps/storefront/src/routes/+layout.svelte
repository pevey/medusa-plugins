<script lang="ts">
	import './layout.css'
	import { ModeWatcher } from 'mode-watcher'
	import { MetaProvider } from '$lib/components/ui/seo'
	import * as Auth from '$lib/components/ui/auth'
	import * as Customer from '$lib/components/ui/customer'
	import UserCircle2 from '@lucide/svelte/icons/user-circle-2'

	const { children } = $props()
</script>

<ModeWatcher />
<MetaProvider
	site={{
		siteName: 'Storefront Dev',
		siteUrl: 'http://localhost:5173',
		titleTemplate: '%s | Storefront Dev'
	}}
>
	<header class="flex items-center justify-between border-b px-4 py-3">
		<span class="font-medium">Storefront Dev</span>
		<div>
			<Customer.SignedOut>
				<Customer.SignInButton />
			</Customer.SignedOut>
			<Customer.SignedIn>
				<Customer.Menu>
					<Customer.MenuTrigger>
						<UserCircle2 class="size-6" />
					</Customer.MenuTrigger>
					<Customer.MenuContent>
						<Customer.MenuItem href="/account">Account</Customer.MenuItem>
						<Customer.SignOut>Sign out</Customer.SignOut>
					</Customer.MenuContent>
				</Customer.Menu>
			</Customer.SignedIn>
		</div>
	</header>
	{@render children()}
	<Auth.Dialog />
</MetaProvider>
