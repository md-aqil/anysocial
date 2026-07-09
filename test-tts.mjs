import { aiOrchestrator } from './dist/services/ai-orchestrator.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Testing AI Voiceover (Kore)...");
  try {
    const result = await aiOrchestrator.generateVoiceover("Hello, this is a test of the Kore voice on the live system.", "Kore", "en-US", false);
    console.log("Success! Output file:", result);
  } catch (e) {
    console.error("Test failed:", e);
  }
}
run();
