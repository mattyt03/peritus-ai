<script>
  import Prism from "prismjs";

  export let code = "";
  export let asResponse = true;
  // TODO: change language
  let language = "javascript";
  // c causes some problems
  let languages = ["python", "javascript", "java", "html", "css", "c++", 'bash', 'jsx', 'golang', 'go']

  $ : {
    for (let lang of languages) {
      if (code.startsWith(lang) || code.startsWith(lang.toUpperCase())) {
        code = code.slice(lang.length);
        break;
      }
    }
    code = code.trim();
    // console.log(code);
  }

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
    /* background-color: hsl(256, 26%, 32%); */
    background-color: #483D67;
  }
</style>
