<script>
    import Fa from 'svelte-fa';
    import { faLightbulb, faWrench, faBanBug, faFlask, faCommentCode, faWandMagicSparkles } from '@fortawesome/pro-regular-svg-icons';
    import logo2 from '../../media/logo2.svg';
    import logoFull from '../../media/logo-full.svg';

    let examples = ['"Implement dijkstra\'s shortest path algorithm in c++"',
                    '"Why is the div on line 24 not being centered properly?"',
                    '"Add a new api endpoint that returns a user\'s liked posts"',
                    // '"Where in the codebase do we handle payments?"',
                    '"Now do the same for the Login component"',];

    export let handleDebug;

</script>

<div class="container">
    <div class="content-container">
        <div class="examples-container">
            <div class="title-container">
                <div class="icon">
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
        <div class="tools-container">
            <div class="title-container">
                <div class="icon">
                    <Fa icon={faWrench} size='1.5x' color="lightgrey"/>
                </div>
                <h1 class="title">Tools</h1>
            </div>
            <div class="tools">
                <button on:click={handleDebug} class="tool">
                    <div class="icon">
                        <Fa icon={faBanBug} size='2x' color="lightgrey"/>
                    </div>
                    <div class="tool-name">
                        Debug
                    </div>
                </button>
                <button class="tool">
                    <div class="icon">
                        <Fa icon={faFlask} size='2x' color="lightgrey"/>
                    </div>
                    <div class="tool-name">
                        Generate Tests
                    </div>
                </button>
                <button class="tool">
                    <div class="icon">
                        <Fa icon={faCommentCode} size='2x' color="lightgrey"/>
                    </div>
                    <div class="tool-name">
                        Add comments
                    </div>
                </button>
                <button class="tool">
                    <div class="icon">
                        <Fa icon={faWandMagicSparkles} size='2x' color="lightgrey"/>
                    </div>
                    <div class="tool-name">
                        Refactor
                    </div>
                </button>
            </div>
        </div>
    </div>
    <div class="logo-container">
        {@html logoFull}
        <!-- Peritus -->
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
        display: flex;
        flex-direction: column;
        justify-content: center;
        height: 100%;
    }
    .content-container {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: space-evenly;
    }
    .examples-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        /* align-items: center; */
    }
    .tools-container {
        display: flex;
        flex-direction: column;
        justify-content: center;
        margin-bottom: 1rem;
    }
    .tools {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
    }
    .tool {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        border-radius: 1rem;
        background-color: #302544;
        overflow: hidden;
        padding: 1rem;
        /* I thought it would just take the max of rem? */
        margin: 0.5rem;
        width: 9rem;
        height: 9rem;
    }
    .tool:hover {
        background-color: #483D67;
    }
    .tool-name {
        text-align: center;
        margin-top: 1rem;
    }
    .icon {
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
        flex-direction: column;
        justify-content: center;
        align-items: center;
        /* margin-bottom: 2rem; */
        margin-bottom: 1rem;
        width: 3rem;
        height: 3rem;
        align-self: center;
        /* color: #302544;
        font-size: 4rem;
        font-weight: 400; */
    }
</style>