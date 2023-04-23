<script>
    import Fa from 'svelte-fa';
    import { faLightbulb } from '@fortawesome/pro-regular-svg-icons'
    import logo from '../../media/logo.svg';
    import logo2 from '../../media/logo2.svg';

    let examples = ['"Implement dijkstra\'s shortest path algorithm in c++"',
                    '"Why is the div on line 24 not being centered properly?"',
                    '"Add a new api endpoint that returns a user\'s liked posts"',
                    '"Where in the codebase do we handle payments?"',
                    '"Now do the same for the Login component"',];

</script>

<div class="container">
    <div class="examples-container">
        <div class="title-container">
            <div class="title-icon">
                <Fa icon={faLightbulb} size='1.5x' color="lightgrey"/>
            </div>
            <h1 class="title">Examples</h1>
        </div>
        <div>
            {#each examples as example}
                <button class="example">
                    {example}
                </button>
            {/each}
        </div>
    </div>
    <div class="logo-container">
        {@html logo2}
    </div>
</div>

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
    .container {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
    }
    .examples-container {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
    }
    .title-icon {
        box-sizing: content-box;
        padding: 0.6rem;
        display: flex;
        flex-direction: center;
        justify-content: center;
    }
    .title-container {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-bottom: 1rem;
    }
    .title {
        /* font-family: "Montserrat", sans-serif; */
        /* color: lightgrey; */
        text-align: center;
        font-size: 1.5rem;
        font-weight: 500;
    }
    .example {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 1rem;
        background-color: #302544;
        overflow: hidden;
        margin-bottom: 1rem;
        padding: 1.15rem;
        /* font-family: "Montserrat", sans-serif; */
        /* color: lightgrey; */
        text-align: center;
    }
    .logo-container {
        display: flex;
        /* THIS WAS THE FUCKING PROBLEM */
        flex-direction: column;
        justify-content: center;
        align-items: center;
        margin-bottom: 2rem;
        width: 5rem;
        height: 5rem;
        align-self: center;
    }
</style>