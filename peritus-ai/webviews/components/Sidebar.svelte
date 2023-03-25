<script>
  import { onMount } from "svelte";
  import { Configuration, OpenAIApi } from "openai";
  import Input from "./Input.svelte";
  import Response from "./Response.svelte";
  // import { glob } from 'glob';

  const configuration = new Configuration({
    apiKey: "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",
  });
  const openai = new OpenAIApi(configuration);

  let selected_code = "";
  let prompt = "";
  let loading = false;
  let result = "";
  let responses = [];
  let next_id = 0;

  // const explain_prompt = "Briefly explain the following code:";
  const system_prompt = "You are an AI coding assistant. I will provide you with code, and I want you to answer any questions I have about the code. I may also ask you to modify or improve the code. If you are asked to modify or improve the code, please rewrite the original code with changes implemented. Do not leave any parts out, even if they are parts that remain unchanged. Use three backticks (```) to indicate the start and end of each code block in your response."

  onMount(() => {
    window.addEventListener("message", (event) => {
      const message = event.data;
      switch (message.type) {
        case "selection-change":
          selected_code = message.value;
          break;
      }
    });
  });

  // const listFiles = async () => {
  //   const jsfiles = glob('**/*.js', { ignore: 'node_modules/**' });
  //   console.log(jsfiles);
  // }

  const fetchResult = async () => {
    console.log("fetching result");
    const res = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      messages: [{ role: "system", content: system_prompt },
        { role: "user", content: `${prompt} + ${selected_code}` }],
    });
    // console.log(res);
    return res?.data?.choices[0]?.message?.content;
  };

  const handleSubmit = async () => {
    // console.log(prompt);
    loading = true;
    result = await fetchResult();
    // TODO: what if prompt and next_id have changed?
    responses = [{ id: next_id, prompt, result}, ...responses];
    loading = false;
    prompt = '';
    next_id++;
  };

  // const streamResult = async () => {
  //   try {
  //     const res = await openai.createChatCompletion(
  //       {
  //         model: "gpt-3.5-turbo",
  //         messages: [{ role: "user", content: `${prompt} + ${selected_code}` }],
  //         stream: true,
  //       },
  //       { responseType: "stream" }
  //     );
  //     // console.log(res);
  //     res.data.on("data", (data) => {
  //       const lines = data
  //         .toString()
  //         .split("\n")
  //         .filter((line) => line.trim() !== "");
  //       for (const line of lines) {
  //         const message = line.replace(/^data: /, "");
  //         if (message === "[DONE]") {
  //           return; // Stream finished
  //         }
  //         try {
  //           const parsed = JSON.parse(message);
  //           console.log(parsed.choices[0].text);
  //         } catch (error) {
  //           console.error(
  //             "Could not JSON parse stream message",
  //             message,
  //             error
  //           );
  //         }
  //       }
  //     });
  //   } catch (error) {
  //     if (error.response?.status) {
  //       console.error(error.response.status, error.message);
  //       error.response.data.on("data", (data) => {
  //         const message = data.toString();
  //         try {
  //           const parsed = JSON.parse(message);
  //           console.error("An error occurred during OpenAI request: ", parsed);
  //         } catch (error) {
  //           console.error("An error occurred during OpenAI request: ", message);
  //         }
  //       });
  //     } else {
  //       console.error("An error occurred during OpenAI request", error);
  //     }
  //   }
  // };
</script>

<body>
  <!-- TODO: fix input and prompt overflow -->
  <Input selected_code={selected_code} handleSubmit={handleSubmit} bind:prompt/>
  {#if loading}
    <Response prompt={prompt} result='Loading...'/>
  {/if}
  <!-- TODO: sort by descending order -->
  {#each responses as res (res.id)}
    <!-- TODO: spacing in between cards is not even -->
    <Response prompt={res.prompt} result={res.result}/>
  {/each}
</body>

<style>
  /* base styles */
  *,
  *::after,
  *::before {
    box-sizing: border-box;
  }
  body {
    display: flex;
    flex-direction: column;
    padding: 0;
  }
</style>