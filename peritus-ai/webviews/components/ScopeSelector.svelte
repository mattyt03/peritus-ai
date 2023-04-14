<script>
    import Fa from 'svelte-fa';
    import { faFile, faCode, faXmark } from '@fortawesome/pro-regular-svg-icons'

    export let setScope;
</script>

<div class="container">
    <button class="scope" on:click={() => setScope("File Context")}>
        <div class="scope-icon">
            <Fa icon={faFile} size='1.5x'/>
        </div>
        <div class="scope-content">
            <h2>File Context</h2>
            <p>The currently active file will be used as context</p>
        </div> 
    </button>
    <button class="scope" on:click={() => setScope("Selection Context")}>
        <div class="scope-icon">
            <Fa icon={faCode} size='1.5x'/>
        </div>
        <div class="scope-content">
            <h2>Selection Context</h2>
            <p>Selected code in your editor will be used as context</p>
        </div>
    </button>
    <button class="scope" on:click={() => setScope("No Context")}>
        <div class="scope-icon">
            <Fa icon={faXmark} size='1.5x'/>
        </div>
        <div class="scope-content">
            <h2>No Context</h2>
            <p>Peritus won't use your code as context at all</p>
        </div> 
    </button>
</div>

<style>
    *,
    *::after,
    *::before {
        box-sizing: border-box;
    }
    .container {
        display: flex;
        flex-direction: column;
        /* padding: 1rem; */
        border-radius: 1rem;
        background-color: #302544;
        padding: 0.5rem;
        margin-bottom: 1rem;
    }
    .scope {
        display: flex;
        border-radius: 0.75rem;
        padding: 0.5rem;
        background-color: #302544;
        justify-content: flex-start;
        align-items: center;
    }
    .scope-content {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: flex-start;
        padding: 0.5rem;
        font-family: "Montserrat", sans-serif;
    }
    .scope-icon {
        box-sizing: content-box;
        padding: 1rem;
        display: flex;
        flex-direction: center;
        justify-content: center;
        width: 3rem;
    }
    .scope:hover {
        background-color: #483D67;
    }
    p {
        text-align: left;
        color: lightgrey;
    }
    h2 {
        text-align: left;
        margin-bottom: 0.25rem;
        font-size: 1rem;
        font-weight: 600;
    }
</style>



