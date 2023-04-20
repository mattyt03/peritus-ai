<script>
    import Fa from 'svelte-fa';
    import { faTriangleExclamation} from '@fortawesome/pro-regular-svg-icons'

    export let content;
</script>

<div class="container">
    <div class="icon-container">
        <Fa icon={faTriangleExclamation} size='2x' color="lightgrey"/>
    </div>
    <div>{content}</div>
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
        justify-content: center;
        align-items: center;
    }
    .icon-container {
        margin: 1rem;
        margin-left: 0;
    }
</style>