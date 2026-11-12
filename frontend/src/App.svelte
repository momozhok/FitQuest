<script>
  import { onMount } from 'svelte'
  import { start } from './experience.js'
  let host
  onMount(() => start(host))
</script>

<div bind:this={host}></div>
