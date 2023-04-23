<script>
  import Prism from "prismjs";
  import Fa from 'svelte-fa';
  import { faCopy, faFileImport} from '@fortawesome/pro-regular-svg-icons'
  import confetti from "canvas-confetti";
  // TODO: is there a way to import all of these at once?
  import "prismjs/components/prism-python";
  import "prismjs/components/prism-javascript";
  import "prismjs/components/prism-typescript";
  import "prismjs/components/prism-java";
  import "prismjs/components/prism-html";
  import "prismjs/components/prism-css";
  import "prismjs/components/prism-c";
  import "prismjs/components/prism-cpp";
  import "prismjs/components/prism-bash";
  import "prismjs/components/prism-jsx";
  import "prismjs/components/prism-go";

  export let code = "";
  export let asResponse;
  export let onReplace;
  export let onCopy;

  let showButtons = false;

  const toggleShow = () => {
    showButtons = !showButtons;
  }

  const handleReplace = async (event) => {
    // const success = await onReplace(code);
    // if (!success) {
    //   // confetti(createConfettiOptions(event));
    //   return;
    // }
    onReplace(code);
    await confetti(createConfettiOptions(event));
  }

  const createConfettiOptions = (event) => {
    const button = event.currentTarget;
    const buttonRect = button.getBoundingClientRect();
    const originX = buttonRect.left + buttonRect.width / 2;
    const originY = buttonRect.top + buttonRect.height / 2;

    return {
      particleCount: 50,
      startVelocity: 15,
      ticks: 50,
      spread: 360,
      origin: {
        x: originX / window.innerWidth,
        y: originY / window.innerHeight,
      },
    };
  }

  let language = "javascript";
  // TODO: c causes some problems
  // TODO: remove redundant languages
  const language_mappings = {
    "python": "python",
    "Python": "python",
    "javascript": "javascript",
    "JavaScript": "javascript",
    "typescript": "typescript",
    "TypeScript": "typescript",
    "ts": "typescript",
    "java": "java",
    "Java": "java",
    "html": "html",
    "css": "css",
    "c++": "cpp",
    "C++": "cpp",
    "cpp": "cpp",
    "bash": "bash",
    "Bash": "bash",
    "jsx": "jsx",
    "js": "javascript",
    "golang": "go",
    "Golang": "go",
    "go": "go",
    "Go": "go",
  }

  $ : {
    for (let lang in language_mappings) {
      if (code.startsWith(lang) || code.startsWith(lang.toUpperCase())) {
        code = code.slice(lang.length);
        language = language_mappings[lang];
        break;
      }
    }
    if (asResponse) {
      code = code.trim();
    }
    // console.log(code);
  }
</script>

<!-- TODO: mouseenter and mouseleave are buggin -->
<div class="outer-container" on:mouseenter={toggleShow} on:mouseleave={toggleShow}>
  {#if asResponse && showButtons}
    <div class="btn-container">
      <button on:click={onCopy(code)} class="btn">
        <Fa icon={faCopy} size='1.5x' color="lightgrey"/>
      </button>
      <button on:click={(e) => handleReplace(e)} class="btn">
        <Fa icon={faFileImport} size='1.5x' color="lightgrey"/>
      </button>
    </div>
  {/if}
  <div class:border-radius="{asResponse}">
    <div class="inner-container">
      <code>
        {@html Prism.highlight(code, Prism.languages[language])}
      </code>
    </div>
  </div>
</div>



<style>
  *,
  *::after,
  *::before {
      box-sizing: border-box;
      padding: 0;
      margin: 0;
      border: none;
  }
  .outer-container {
    position: relative;
  }
  .outer-container {
    position: relative;
  }
  .border-radius {
    border-radius: 0.75rem;
    overflow: hidden;
  }
  .inner-container {
    display: flex;
    padding: 1rem;
    white-space: pre;
    overflow: auto;
    /* background-color: var(--vscode-input-background); */
    /* background-color: hsl(256, 26%, 32%); */
    background-color: #483D67;
  }
  .btn-container {
    position: absolute;
    top: -1.5rem;
    right: 1.5rem;
    background-color: #483D67;
    display: flex;
    justify-content: space-between;
    align-items: center;
    border-radius: 0.5rem;
    box-shadow: 0 3px 10px rgb(0 0 0 / 0.3);
  }
  .btn {
    box-sizing: content-box;
    cursor: pointer;
    height: 2rem;
    width: 2rem;
    display: flex;
    background-color: transparent;
    justify-content: center;
    align-items: center;
    padding: 0.5rem;
  }
</style>
