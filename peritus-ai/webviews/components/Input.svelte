<script>
    import Code from "./Code.svelte";
    import Fa from 'svelte-fa';
    import { faFile, faCode, faXmark, faChevronDown } from '@fortawesome/pro-regular-svg-icons'
    import ScopeSelector from "./ScopeSelector.svelte";
    import { tick } from "svelte";

    let scopeSelector = false;
    export let prompt;
    export let scope;
    export let selected_code;
    export let handleSubmit;
    export let streaming;

    // TODO: how to restrict values of context?
    const setScope = (new_scope) => {
      scope = new_scope;
      scopeSelector = false;
      if (new_scope !== "Selection Context") {
        selected_code = "";
      }
    }

    // function to reset textarea when prompt gets cleared after a response
    // TODO: redundant
    const resetTextareaSize = async () => {
      await tick();
      const textarea = document.querySelector(".prompt");
      if (textarea) {
          // console.log('resetting');
          textarea.style.height = "auto";
          textarea.style.height = textarea.scrollHeight + "px";
      }
    };

    $: {
      if (prompt === "") {
        resetTextareaSize();
      }
    }

    const autoResize = (event) => {
      const textarea = event.target;
      textarea.style.height = "auto";
      textarea.style.height = textarea.scrollHeight + "px";

      if (event.key === "Enter" && !event.shiftKey && !event.ctrlKey) {
        event.preventDefault();
        handleSubmit();
      }
    }

</script>


<div class="container" class:less-margin="{scopeSelector}">
  <div class="border-radius">
    <!-- TODO: do I need both the on:input and on:keydown? -->
    <form on:submit|preventDefault={handleSubmit}>
      <textarea 
        class="prompt" 
        type="text"
        rows="1"
        bind:value={prompt} 
        placeholder="How may I assist you?" 
        disabled={streaming} 
        on:input={autoResize}
        on:keydown={autoResize}
      />
      <!-- <input class="prompt" type="text" bind:value={prompt} placeholder="How may I assist you?" disabled={streaming}/> -->
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
      overflow: hidden;
      padding: 1.15rem;
      white-space: pre-wrap;
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