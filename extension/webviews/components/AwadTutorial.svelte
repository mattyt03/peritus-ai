<script lang="ts">
    import { onMount } from "svelte";
  // let count = 0;
  let todos: Array<{ text: string; completed: boolean }> = [];
  let text = "";

  onMount(() => {
    window.addEventListener('message', event => {
        const message = event.data; // The json data that the extension sent
        switch (message.type) {
            case 'new-todo':
                todos = [...todos, { text: message.value, completed: false }];
                break;
        }
    });
  });
</script>

<!-- <div>{count}</div>
<button on:click={() => count++}>increment</button> -->

<!-- <div>text: {text}</div>
    <button on:click={() => (text = "")}>reset</button> -->

<form
  on:submit={(e) => {
    e.preventDefault();
    todos = [...todos, { text, completed: false }];
    text = "";
  }}
>
  <input bind:value={text} type="text" />
</form>

<!-- what is a pre tag? -->
<!-- <pre>
    {JSON.stringify(todos, null, 2)}
</pre> -->

<ul>
  {#each todos as todo}
    <li
      class:complete={todo.completed}
      on:click={() => (todo.completed = !todo.completed)}
      on:keydown={() => (todo.completed = !todo.completed)}
    >
      {todo.text}
    </li>
  {/each}
</ul>

<button on:click={() => {
    tsvscode.postMessage({type: 'onInfo', value: 'info message'});
}}>
    Click me for info
</button>

<button on:click={() => {
    tsvscode.postMessage({type: 'onError', value: 'error message'});
}}>
    Click me for error
</button>

<style>
  .complete {
    text-decoration: line-through;
  }
</style>