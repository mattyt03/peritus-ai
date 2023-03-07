// codex testing

const fs = require("fs");
const path = require("path");
const { Configuration, OpenAIApi } = require("openai");
const configuration = new Configuration({
  apiKey: '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',
});
const openai = new OpenAIApi(configuration);

async function run() {
    const filePath = path.join(__dirname, "/Login/Login.js");
    // why doesn't the ./ syntax work?
    const input = fs.readFileSync(filePath, "utf-8");
    // console.log(input);
    const response = await openai.createEdit({
      model: "code-davinci-edit-001",
      input: input,
      instruction: "Convert the html form to a formik form. Then, add validation.",
    });
    console.log(response['data']['choices'][0]['text']);
}

run();