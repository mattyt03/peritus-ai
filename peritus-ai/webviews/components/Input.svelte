<script>
    import Code from "./Code.svelte";
    import Fa from 'svelte-fa';
    import { faFile, faCode, faXmark, faChevronDown } from '@fortawesome/pro-regular-svg-icons'
    import ScopeSelector from "./ScopeSelector.svelte";

    let scopeSelector = false;
    export let prompt;
    export let scope;
    export let selected_code;
    export let handleSubmit;

    // TODO: how to restrict values of context?
    const setScope = (new_scope) => {
      scope = new_scope;
      scopeSelector = false;
      if (new_scope !== "Selection Context") {
        selected_code = "";
      }
    }
</script>


<div class="container" class:less-margin="{scopeSelector}">
  <div class="border-radius">
    <form on:submit|preventDefault={handleSubmit}>
      <input class="prompt" type="text" bind:value={prompt} placeholder="How may I assist you?"/>
    </form>
    <!-- refactor this into a separate component -->
    <button class="scope" on:click={() => {scopeSelector = !scopeSelector}}>
      <div class="scope-icon">
        {#if scope === "File Context"}
          <Fa icon={faFile} size='1x' color="lightgrey"/>
        {:else if scope === "Selection Context"}
          <Fa icon={faCode} size='1x' color="lightgrey"/>
        {:else if scope === "No Context"}
          <Fa icon={faXmark} size='1x' color="lightgrey"/>
        {/if}
      </div>
      <p>{scope}</p>
      <div class="scope-icon">
        <Fa icon={faChevronDown} size='0.75x' color="lightgrey"/>
      </div>
    </button>
    {#if scope === "Selection Context" && selected_code != ""}
      <Code code={selected_code} asResponse={false}/>
    {/if}
  </div>
</div>
{#if scopeSelector}
  <ScopeSelector setScope={setScope}/>
{/if}


<style>
  /* base styles */
  *,
  *::after,
  *::before {
    box-sizing: border-box;
  }
  .prompt {
      /* background-color: var(--vscode-editor-background); */
      background-color: #302544;
      resize: none;
      height: auto;
      padding: 1.15rem;
      white-space: initial;
      font-family: "Montserrat", sans-serif;
      margin: 0;
  }
  *:focus {
    outline: none;
  }
  .container {
    display: flex;
    flex-direction: column;
    /* background-color: var(--vscode-input-background); */
    margin-top: 1rem;
    margin-bottom: 1rem;
  }
  .less-margin {
    margin-bottom: 0.1rem;
  }
  .border-radius {
    border-radius: 1rem;
    background-color: #302544;
    overflow: hidden;
  }
  .scope {
      display: flex;
      /* padding: 0.5rem; */
      background-color: #483D67;
      justify-content: center;
      align-items: center;
      padding: 0;
  }
  .scope-icon {
      padding: 0.5rem;
      display: flex;
      flex-direction: center;
      justify-content: center;
  }
  p {
      text-align: center;
      color: lightgrey;
      font-family: "Montserrat", sans-serif;
      text-transform: uppercase;
      font-weight: 600;
      font-size: 0.8rem;
  }
</style>