import dotenv from 'dotenv';
dotenv.config();
import { aiOrchestrator } from './src/services/ai-orchestrator.service.js';
import { execSync } from 'child_process';

async function testTTS() {
  console.log("🗣️  Testing Gemini TTS Audio Output...\n");

  try {
    const audioPath = await aiOrchestrator.generateVoiceover(
      "Did you know the ocean holds a secret older than the dinosaurs? Scientists just found something massive.",
      'Puck',
      'en-US'
    );
    
    console.log(`\n✅ Audio file saved: ${audioPath}`);
    
    // Run ffprobe on it to verify FFmpeg can read it
    try {
      const result = execSync(`ffprobe -v quiet -print_format json -show_format -show_streams "${audioPath}" 2>&1`).toString();
      const info = JSON.parse(result);
      console.log("✅ FFprobe SUCCESS! Format:", info.format?.format_name, "| Duration:", info.format?.duration, "s");
    } catch (ffErr: any) {
      console.error("❌ FFprobe still failing:", ffErr.stdout?.toString() || ffErr.message);
    }

  } catch (e: any) {
    console.error("❌ TTS generation failed:", e.message);
  }
}

testTTS();
