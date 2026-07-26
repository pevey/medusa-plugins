<script lang="ts">
	import { getCustomer } from 'sveltekit-medusa-sdk/customer'
	import * as Auth from '$lib/components/ui/auth'
	import * as Customer from '$lib/components/ui/customer'
</script>

<h1>Account</h1>

<Customer.SignedIn>
	{#each [await getCustomer()] as customer (customer?.id)}
		<p>Signed in as {customer?.email}</p>
	{/each}
	<Customer.SignOut>Sign out</Customer.SignOut>
</Customer.SignedIn>

<Customer.SignedOut>
	<Auth.LoginForm class="mx-auto max-w-sm">
		<Auth.Field name="email">
			<Auth.Label>Email</Auth.Label>
			<Auth.Input type="email" autocomplete="email" />
			<Auth.Error />
		</Auth.Field>
		<Auth.Field name="password">
			<Auth.Label>Password</Auth.Label>
			<Auth.Input type="password" autocomplete="current-password" />
			<Auth.Error />
		</Auth.Field>
		<Auth.Error />
		<Auth.Submit>Sign in</Auth.Submit>
	</Auth.LoginForm>
</Customer.SignedOut>
