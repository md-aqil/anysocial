import dotenv from 'dotenv';
dotenv.config();

async function runTests() {
  // Dynamically import aiOrchestrator AFTER dotenv is loaded
  const { aiOrchestrator } = await import('./src/services/ai-orchestrator.service.js');
  
  console.log("🚀 Final Test: Premium Vertex AI Models Pipeline...\n");

  // 1. Test Gemini 1.5 Pro (Text)
  try {
    console.log("📝 1. Testing Script Generation (Gemini 1.5 Pro)...");
    const script = await aiOrchestrator.generateContent("Write a 1-sentence engaging hook about cyberpunk cities, targeting teenagers.");
    console.log("✅ Success! Output:");
    console.log(`"${script}"\n`);
  } catch (e: any) {
    console.error("❌ Gemini Failed:", e.message);
  }

  // 2. Test Imagen 3 (Image)
  try {
    console.log("🎨 2. Testing Image Generation (Imagen 3)...");
    const imagePath = await aiOrchestrator.generateImage("A cinematic, hyper-realistic shot of a glowing neon cyberpunk city, highly detailed, 4k", 123);
    console.log(`✅ Success! Image saved to: ${imagePath}\n`);
  } catch (e: any) {
    console.error("❌ Imagen 3 Failed:", e.message);
  }

  // 3. Test Gemini Multimodal TTS (Audio)
  try {
    console.log("🗣️  3. Testing Voice Synthesis (Gemini 2.0 Flash Audio)...");
    const audioPath = await aiOrchestrator.generateVoiceover("Welcome to the new cinematic engine. It is fully operational.");
    console.log(`✅ Success! Audio saved to: ${audioPath}\n`);
  } catch (e: any) {
    console.error("❌ TTS Failed:", e.message);
  }

  console.log("🎉 All Tests Completed!");
}

runTests();
