<script>
    import Fa from 'svelte-fa';
    import { faArrowRight } from '@fortawesome/free-solid-svg-icons'
    import { faHandWave } from '@fortawesome/pro-regular-svg-icons'
    import { fade } from 'svelte/transition';
    export let onSubmit;
    export let API_KEY;
</script>

<div class="container"
    in:fade="{{duration: 300}}"
>
    <div class="popup">
        <div class="title-container">
            <div class="welcome-icon">
                <Fa icon={faHandWave} size='2.25x'/>
            </div>
            <h1 class="title">Welcome!</h1>
        </div>
        <p class="text">To participate in our beta, you'll need an OpenAI API key. To create a key, visit 
            <a class="link" href="https://platform.openai.com/account/api-keys">OpenAI</a>.</p>
        <form class="form" on:submit|preventDefault={onSubmit}>
            <input type="text" class="input" name="api-key" bind:value={API_KEY} placeholder="Enter your key here"/>
            <!-- <button type="submit" class="button">
                <div class="button-text">Get Started</div>
                <div class="arrow-icon">
                    <Fa icon={faArrowRight} size='1x'/>
                </div>
            </button> -->
        </form>
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
    *:focus {
        outline: none;
    }
    .popup {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        background-color: #302544;
        border-radius: 1rem;
        padding: 2rem;
        margin: 1rem;
    }
    .container {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        height: 100%;
    }
    .form {
        display: flex;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        width: 100%;
    }
    .input {
        display: flex;
        font-family: "Montserrat", sans-serif;
        justify-content: center;
        align-items: center;
        border-radius: 1rem;
        background-color: #483D67;
        margin-bottom: 1rem;
        padding: 1.15rem;
        border: none;
        width: 100%;
    }
    .button {
        display: flex;
        justify-content: center;
        align-items: center;
        border-radius: 1rem;
        background-color: #483D67;
        overflow: hidden;
        margin-bottom: 1rem;
        padding: 1.15rem;
        text-align: center;
        width: 100%;
    }
    .button-text {
        display: flex;
        justify-content: center;
        align-items: center;
        font-weight: 500;
    }
    .arrow-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-left: 0.5rem;
    }
    .welcome-icon {
        display: flex;
        justify-content: center;
        align-items: center;
        margin-right: 1rem;
    }
    .title-container {
        display: flex;
        /* justify-content: center; */
        align-items: center;
        padding: 1rem;
    }
    .title {
        /* text-align: center; */
        font-size: 2.5rem;
        font-weight: 500;
    }
    .text {
        font-size: 1.2rem;
        line-height: 1.5;
        padding: 1rem;
        margin-bottom: 1.5rem;
        text-align: center;
    }
    .link {
        display: inline;
        padding: 0;
        margin: 0;
    }
</style>