const fs = require('fs');
const path = '/Users/mdaqil/Documents/anysocial/src/services/ai-orchestrator.service.ts';
let code = fs.readFileSync(path, 'utf8');

const regex = /\/\/ 2\. Voice Synthesis Engine \(Gemini Multimodal \/ Kokoro \/ Google Cloud\)[\s\S]*?(?=\/\/ 3\. Lyria - Music Generation via Vertex AI interactions API)/;

const newCode = `// 2. Voice Synthesis Engine (Google Cloud TTS)
  async generateVoiceover(text: string, voiceName: string = 'en-US-Journey-D', language: string = 'en-US'): Promise<string> {
    const textToSpeech = await import('@google-cloud/text-to-speech');
    const client = new textToSpeech.TextToSpeechClient();
    
    let bcp47Language = 'en-US';
    let actualVoiceName = 'en-US-Journey-D';

    if (language.includes('Hindi')) {
      bcp47Language = 'hi-IN';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'hi-IN-Neural2-A';
      else actualVoiceName = 'hi-IN-Neural2-C';
    } else if (language.includes('Spanish')) {
      bcp47Language = 'es-ES';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'es-ES-Journey-O';
      else actualVoiceName = 'es-ES-Journey-D';
    } else {
      bcp47Language = 'en-US';
      if (voiceName === 'Aoede' || voiceName === 'Kore') actualVoiceName = 'en-US-Journey-O';
      else if (voiceName === 'Charon') actualVoiceName = 'en-US-Journey-F';
      else actualVoiceName = 'en-US-Journey-D';
    }

    const request = {
      input: { text: text },
      voice: { languageCode: bcp47Language, name: actualVoiceName },
      audioConfig: { 
        audioEncoding: 'LINEAR16',
        sampleRateHertz: 24000
      },
    };

    try {
      const [response] = await client.synthesizeSpeech(request);
      const uniqueId = Math.random().toString(36).substring(7);
      const os = await import('os');
      const path = await import('path');
      const tempPath = path.join(os.tmpdir(), \`voiceover_\${Date.now()}_\${uniqueId}.wav\`);
      
      const fs = await import('fs');
      fs.writeFileSync(tempPath, response.audioContent, 'binary');
      return tempPath;
    } catch (e: any) {
      console.error("[Google Cloud TTS Error]:", e.message || e);
      throw new Error(\`TTS Failed: \${e.message}\`);
    }
  }

  `;

code = code.replace(regex, newCode);
fs.writeFileSync(path, code);
console.log('Patched ai-orchestrator.service.ts');
