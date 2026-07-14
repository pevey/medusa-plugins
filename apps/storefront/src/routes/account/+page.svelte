<script lang="ts">
	import { login, logout } from 'sveltekit-medusa-sdk'
</script>

<h1>Account</h1>

<form {...login}>
	<label>Email <input {...login.fields.email.as('email')} /></label>
	{#each login.fields.email.issues() as issue}<span>{issue.message}</span>{/each}
	<label>Password <input {...login.fields.password.as('password')} /></label>
	<button>Log in</button>
</form>

<button onclick={() => logout()}>Log out</button>
