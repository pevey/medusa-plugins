<script lang="ts">
  import { getPing } from '@pevey/sveltekit-medusa-sdk'
  import { getPing as getPingSubpath } from '@pevey/sveltekit-medusa-sdk/ping'
</script>

<h1>Discovery probe</h1>
<p>barrel: {await getPing()}</p>
<p>subpath: {await getPingSubpath()}</p>
