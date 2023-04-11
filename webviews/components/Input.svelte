<script>
    import Code from "./Code.svelte";

    export let prompt;
    export let selected_code = "";
    export let handleSubmit;
    
</script>

<form on:submit|preventDefault={handleSubmit}>
    <div class="container">
    <input class="prompt" type="text" bind:value={prompt} placeholder="How may I assist you?"/>
    <Code code={selected_code} asResponse={false}/>
    </div>
</form>
  
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
        padding: 1rem;
        white-space: initial;
        font-family: "Montserrat", sans-serif;
    }
    *:focus {
	    outline: none;
    }
    .container {
      display: flex;
      flex-direction: column;
      /* padding: 1rem; */
      border-radius: 1rem;
      overflow: auto;
      background-color: #302544;
      /* background-color: var(--vscode-input-background); */
      /* border-color: var(--vscode-input-background); */
      border: 1px;
    }
  </style> 