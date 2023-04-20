<script>
    export let text = "";

    let beginsWithCode = text.startsWith("`");
    // console.log(beginsWithCode)
    let mod = beginsWithCode ? 0 : 1;
    // TODO: add this to system prompt
    let segments = text.split("`");
    segments = segments.filter(segment => segment !== "");

    $ : {
        segments = text.split("`");
        segments = segments.filter(segment => segment !== "");
        // console.log(segments);
    }

</script>


<p class="response-text">
    {#each segments as segment, i}
        {#if i % 2 === mod}
            <code>{segment}</code>
        {:else}
            {segment}
        {/if}
    {/each}
</p>


<style>
    *,
    *::after,
    *::before {
        box-sizing: border-box;
        color: lightgrey;
        font-family: "Montserrat", sans-serif;
        padding: 0;
        margin: 0;
        border: none;
    }
    .response-text {
        white-space: pre-wrap;
        word-wrap: break-word;
    }
</style>