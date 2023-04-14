<script>
    import Code from "./Code.svelte";
    import Text from "./Text.svelte";
    import Fa from 'svelte-fa';
    import { faXmark } from '@fortawesome/pro-regular-svg-icons'

    export let prompt;
    export let result;
    export let id;
    export let onRemove;

    // TODO: does this need to be inside the $?
    let beginsWithCode = result.startsWith("```");
    // console.log(beginsWithCode)
    let mod = beginsWithCode ? 0 : 1;
    let segments = result.split("```");
    segments = segments.filter(segment => segment !== "");

    $ : {
        segments = result.split("```");
        segments = segments.filter(segment => segment !== "");
        // console.log(segments);
    }

    // let showClose = false;
    // const toggleShow = () => {
    //     showClose = !showClose;
    // }

</script>
  
<!-- on:mouseenter={toggleShow} on:mouseleave={toggleShow} -->
<div class="container">
  <button on:click={() => onRemove(id)} class="close-btn">
    <Fa icon={faXmark} size='1.25x' color="lightgrey"/>
  </button>
  <!-- {#if showClose}
  {/if} -->
  <div class="prompt">{prompt}</div>
  <div class="response">
      {#each segments as segment, i}
          {#if i % 2 === mod}
            <Code code={segment} />
          {:else}
            <Text text={segment} />
          {/if}
      {/each}
  </div>
</div>
  
  <style>
    /* how do you share styles between svelte components? */
    .prompt {
        /* background-color: #302544; */
        background-color: #483D67;
        /* get rid of some of these */
        resize: none;
        height: auto;
        padding: 1rem;
        white-space: initial;
        width: 100%;
        border-radius: 0.75rem;
        text-align: center;
        margin-bottom: 1rem;
        font-family: "Montserrat", sans-serif;
    }
    .response {
        /* padding: 0.5rem; */
        width: 100%;
    }
    .container {
      display: flex;
      flex-direction: column;
      position: relative;
      align-items: center;
      padding: 1.5rem;
      line-height: 1.5;
      border-radius: 1rem;
      /* overflow: auto; */
      background-color: #302544;
      /* background-color: var(--vscode-input-background); */
      /* border-color: var(--vscode-input-background); */
      margin-bottom: 1rem;
    }
    .close-btn {
        position: absolute;
        top: -0.66rem;
        left: -0.66rem;
        height: 2rem;
        width: 2rem;
        display: flex;
        justify-content: center;
        align-items: center;
        background-color: #483D67;
        border-radius: 100%;
        padding: 0.5rem;
        /* box-shadow: 0 3px 10px rgb(0 0 0 / 0.3); */
    }
  </style>