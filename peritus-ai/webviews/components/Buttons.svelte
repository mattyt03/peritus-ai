<script>
    import Fa from 'svelte-fa';
    import { faLightbulb } from '@fortawesome/pro-regular-svg-icons'
    import logo from '../../media/logo.svg';
    import logo2 from '../../media/logo2.svg';

</script>

<div class="container">
    <div class="examples-container">
        <div class="title-container">
            <h1 class="title">Buttons</h1>
        </div>
        <div>
            <button class="debugButton">Debug with Peritus</button> <button class="memcheck">Memory Check with Peritus</button>
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
    .debugButton {
        display: flex;
        justify-content: center;
        align-items: left;
        border-radius: 1rem;
        background-color: #302544;
        overflow: hidden;
        margin-bottom: 1rem;
        padding: 1.15rem;
        /* font-family: "Montserrat", sans-serif; */
        /* color: lightgrey; */
        text-align: center;
    } 
    .memcheck {
        display: flex;
        justify-content: center;
        align-items: left;
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