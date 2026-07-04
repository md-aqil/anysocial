import { aiOrchestrator } from './src/services/ai-orchestrator.service.js';
import dotenv from 'dotenv';
dotenv.config();

async function run() {
  try {
    const res = await aiOrchestrator.generateImage("A cinematic shot of an Indian woman in a pink kurti", 123);
    console.log("Success:", res);
  } catch (e: any) {
    console.error("Test failed:", e.message);
  }
}
run();
