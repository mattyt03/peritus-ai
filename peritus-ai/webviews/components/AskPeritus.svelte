<script>
    import Code from "./Code.svelte";
    import { SidebarProvider } from './SidebarProvider';
    let inputText = "";
    let showAskPeritus = true;
  
    function handleInput(event) {
      inputText = event.target.value;
      showAskPeritus = false;
    
     }
  
  </script>
    
    <style>
      .black-box {
        background-color: black;
        width: 389px;
        height: 556px;
      }
  
      .header {
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-family: "Epilogue", sans-serif;
      font-size: 45px;
      font-weight: bold;
      color: white;
      text-align: center;
    }
  
    .input-box{
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, 50%);
      width: 389px;
      height: 556px;
      border: none;
      background-color: #2E2E39;
      color: white;
      font-size: 20px;
      font-family: "Epilogue", sans-serif;
      text-align: left;
    }
  
      .white-box {
      position: absolute;
      top: calc(50% + 40px);
      left: 50%;
      transform: translate(-50%, -50%);
      width: 389px;
      height: 60px;
      background-color: white;
      border-radius: 5px;
      box-shadow: 0 0 10px rgba(0, 0, 0, 0.2);
    }
  
    
    </style>
    
    <div class="black-box">
        <SidebarProvider>
            
      {#if showAskPeritus}
      <div class="header">Ask Peritus...</div>
      <input type="text" class="input-box" on:input={handleInput} placeholder="Type your question here">
      <div class="white-box"></div>
      {:else}
      <input type="text" class="input-box" on:input={handleInput} placeholder="Type your question here">
      <div class="white-box"></div>
      {/if}
      <Code />
        </SidebarProvider>
    </div>
  