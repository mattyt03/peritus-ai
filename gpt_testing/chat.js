// chatgpt testing

const fs = require("fs");
const path = require("path");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: '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',
});
const openai = new OpenAIApi(configuration);

const prompt1 = `I want you to give me suggestions on how to improve some React code. I will show you the contents of a React file, and I want you provide a list of suggestions on how to improve the code. Improvements can include making the code more concise, more performant, and more robust. After listing the suggestions, I want you to provide an updated version of the code that implements the suggestions. Here is the code: \n\n`;

async function run() {
    const sourcePath = path.join(__dirname, "/Success/Success.js");
    // why doesn't the ./ syntax work?
    const code = fs.readFileSync(sourcePath, "utf-8");
    // console.log(input);
    // catch errors
    const completion = await openai.createChatCompletion({
      model: "gpt-3.5-turbo",
      "messages": [
        {"role": "user", "content":`${prompt1} + ${code}`},
      ]
    });
    // write contents out to a new file
    const res = completion.data.choices[0].message;
    // console.log(res);
    const content = res['content'];
    const destPath = path.join(__dirname, "/Success/res1.txt");
    fs.writeFile(destPath, content, err => {
      if (err) {
        console.error(err);
      }
    });
}

run();