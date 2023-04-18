<script>
  import Prism from "prismjs";
  import Fa from 'svelte-fa';
  import { faCopy, faFileImport} from '@fortawesome/pro-regular-svg-icons'
  import confetti from "canvas-confetti";

  export let code = "";
  export let asResponse;
  export let onReplace;
  export let onCopy;

  let showButtons = false;
  let btn;

  const toggleShow = () => {
    showButtons = !showButtons;
  }

  const handleReplace = async (event) => {
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

  // TODO: change language
  let language = "javascript";
  // c causes some problems
  // JavaScript also won't get recognized
  let languages = ["python", "Python", "javascript", "JavaScript", "java", "Java", "html", "css", "c++", "C++", "bash", "Bash", "jsx", "golang", "Golang", "go", "Go", "js"]

  $ : {
    for (let lang of languages) {
      if (code.startsWith(lang) || code.startsWith(lang.toUpperCase())) {
        code = code.slice(lang.length);
        break;
      }
    }
    if (asResponse) {
      code = code.trim();
    }
    // console.log(code);
  }
</script>

<div class="outer-container" on:mouseenter={toggleShow} on:mouseleave={toggleShow}>
  {#if asResponse && showButtons}
    <div class="btn-container">
      <button on:click={onCopy(code)} class="btn">
        <Fa icon={faCopy} size='1.5x' color="lightgrey"/>
      </button>
      <button on:click={(e) => handleReplace(e)} class="btn" bind:this={btn}>
        <Fa icon={faFileImport} size='1.5x' color="lightgrey"/>
      </button>
    </div>
  {/if}
  <div class:border-radius="{asResponse}">
    <div class="inner-container">
      <!-- what is a pre tag? -->
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
