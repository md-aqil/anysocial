import axios from "axios";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const invokeUrl = "https://ai.api.nvidia.com/v1/genai/black-forest-labs/flux.2-klein-4b";

const API_KEY = "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";

const VALID_SIZES = [768, 832, 896, 960, 1024, 1088, 1152, 1216, 1280, 1344];

async function generateImage(prompt, width, height, cfgScale, seed, outputPath) {
    const payload = {
        prompt,
        width,
        height,
        seed,
        cfg_scale: cfgScale
    };

    console.log(`Generating image with prompt: ${prompt.substring(0, 100)}...`);

    if (response.status !== 200) {
        throw new Error(`Invocation failed with status ${response.status}: ${JSON.stringify(response.data)}`);
    }

    const responseBody = response.data;
    
    if (responseBody.artifacts && responseBody.artifacts.length > 0) {
        const imageData = responseBody.artifacts[0].base64;
        const buffer = Buffer.from(imageData, 'base64');
        
        const outputDir = path.dirname(outputPath);
        if (!fs.existsSync(outputDir)) {
            fs.mkdirSync(outputDir, { recursive: true });
        }
        
        fs.writeFileSync(outputPath, buffer);
        console.log(`Image saved to: ${outputPath}`);
    } else {
        throw new Error("No image in response");
    }
}

function getClosestSize(size) {
    return VALID_SIZES.reduce((prev, curr) => 
        Math.abs(curr - size) < Math.abs(prev - size) ? curr : prev
    );
}

const args = process.argv.slice(2);
const promptFile = args[0];
const outputPath = args[1];
const aspectRatio = args[2] || "1:1";

if (!promptFile || !outputPath) {
    console.log("Usage: node generate_flux.js <prompt.json> <output.jpg> [aspect_ratio]");
    console.log("Aspect ratios: 1:1, 4:5, 9:16, 16:9, 3:2, 2:3");
    process.exit(1);
}

const promptData = JSON.parse(fs.readFileSync(promptFile, "utf-8"));

const aspectRatios = {
    "1:1": { width: 1024, height: 1024 },
    "4:5": { width: 1024, height: 1280 },
    "9:16": { width: 768, height: 1344 },
    "16:9": { width: 1344, height: 768 },
    "3:2": { width: 1216, height: 800 },
    "2:3": { width: 800, height: 1216 },
};

const dimensions = aspectRatios[aspectRatio] || aspectRatios["1:1"];
const width = getClosestSize(dimensions.width);
const height = getClosestSize(dimensions.height);

generateImage(
    promptData.prompt,
    width,
    height,
    promptData.cfg_scale || 1,
    promptData.seed || 0,
    outputPath
).catch(err => {
    console.error(err);
    process.exit(1);
});
