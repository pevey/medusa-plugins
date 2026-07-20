<script lang="ts">
	import './layout.css';
	import { ModeWatcher } from 'mode-watcher';

	const { children } = $props();
</script>

<ModeWatcher />
{@render children()}
