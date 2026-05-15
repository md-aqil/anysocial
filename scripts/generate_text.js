import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const API_KEY = "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";
const BASE_URL = "https://integrate.api.nvidia.com/v1";
const MODEL = "mistralai/mistral-small-4-119b-2603";

async function generateText(prompt, outputPath) {
  console.log(`Generating text with prompt: ${prompt.substring(0, 100)}...`);

  const response = await axios.post(
    `${BASE_URL}/chat/completions`,
    {
      model: MODEL,
      messages: [{ role: "user", content: prompt }],
      temperature: 1,
      top_p: 0.9,
      max_tokens: 4096,
      stream: false
    },
    {
      headers: {
        "Authorization": `Bearer ${API_KEY}`,
        "Content-Type": "application/json",
      },
      timeout: 180000,
    }
  );

  const responseText = response.data?.choices?.[0]?.message?.content;
  
  if (!responseText) {
    throw new Error("No content in response");
  }

  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  fs.writeFileSync(outputPath, responseText);
  console.log(`Text saved to: ${outputPath}`);
  
  return responseText;
}

const args = process.argv.slice(2);
const promptFile = args[0];
const outputPath = args[1];

if (!promptFile || !outputPath) {
  console.log("Usage: node generate_text.js <prompt.txt> <output.txt>");
  process.exit(1);
}

const prompt = fs.readFileSync(promptFile, "utf-8");

generateText(prompt, outputPath).catch(err => {
  console.error(err);
  process.exit(1);
});