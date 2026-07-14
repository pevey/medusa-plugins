<script lang="ts">
	import { login, logout, getCustomer } from 'sveltekit-medusa-sdk'
</script>

<h1>Account</h1>

{#each [await getCustomer()] as customer}
	{#if customer}
		<p>Signed in as {customer.email}</p>
	{:else}
		<form {...login}>
			<label>Email <input {...login.fields.email.as('email')} /></label>
			{#each login.fields.email.issues() as issue}<span>{issue.message}</span>{/each}
			<label>Password <input {...login.fields.password.as('password')} /></label>
			{#each login.fields.password.issues() as issue}<span>{issue.message}</span>{/each}
			{#if login.result && !login.result.ok}<span>Login failed ({login.result.code})</span>{/if}
			<button>Log in</button>
		</form>
	{/if}
{/each}

<button onclick={() => logout()}>Log out</button>
