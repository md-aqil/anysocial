import { aiOrchestrator } from './src/services/ai-orchestrator.service';
async function test() {
    console.log("Testing generateMusic...");
    const path = await aiOrchestrator.generateMusic("Cinematic epic music");
    console.log("Saved to:", path);
}
test();
