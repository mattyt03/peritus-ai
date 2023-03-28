<script>
    import Code from "./Code.svelte";

    export let prompt;
    export let result;
    // console.log(result)
    let beginsWithCode = result.startsWith("```");
    console.log(beginsWithCode)
    let mod = beginsWithCode ? 0 : 1;
    let segments = result.split("```");
    segments = segments.filter(segment => segment !== "");
    console.log(segments);

</script>
  
<div class="container">
  <div class="prompt">{prompt}</div>
  <div class="response">
      {#each segments as segment, i}
          {#if i % 2 === mod}
              <Code code={segment} />
          {:else}
              <p class="response-text">{segment}</p>
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
    .response-text {
        white-space: pre-wrap;
        font-family: "Montserrat", sans-serif;
    }
    .response {
        /* padding: 0.5rem; */
        width: 100%;
    }
    .container {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 1.5rem;
      line-height: 1.5;
      border-radius: 1rem;
      /* overflow: auto; */
      background-color: #302544;
      /* background-color: var(--vscode-input-background); */
      /* border-color: var(--vscode-input-background); */
      border: 1px;
    }
  </style>