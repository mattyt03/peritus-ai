<script>
  import Prism from "prismjs";

  export let code = "";
  export let asResponse = true;
  // gpt will specify the language
  let language = "javascript";

</script>

<div class:border-radius="{asResponse}">
  <div class="container">
    <!-- what is a pre tag? -->
    <code>
      {@html Prism.highlight(code, Prism.languages[language])}
    </code>
  </div>
</div>

<style>
  *,
  *::after,
  *::before {
    box-sizing: border-box;

  }
  .border-radius {
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .container {
    display: flex;
    padding: 1rem;
    white-space: pre;
    overflow: auto;
    /* background-color: var(--vscode-input-background); */
    background-color: hsl(256, 26%, 32%);
  }
</style>
