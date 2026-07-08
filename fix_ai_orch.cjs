const fs = require('fs');
const path = '/Users/mdaqil/Documents/anysocial/src/services/ai-orchestrator.service.ts';
let code = fs.readFileSync(path, 'utf8');

// Fix audioConfig.audioEncoding type
code = code.replace(
  /audioEncoding: 'LINEAR16',/,
  "audioEncoding: 'LINEAR16' as const,"
);

// Check if transcribeAudio is missing, if so, add it before generateMusic
if (!code.includes('async transcribeAudio')) {
  const transcribeAudioCode = `  /**
   * Transcribes audio and returns exact word-level timestamps using Google Cloud Speech-to-Text.
   */
  async transcribeAudio(audioPath: string, languageCode: string = 'en-US'): Promise<Array<{ word: string, startTime: number, endTime: number }>> {
    console.log(\`[Transcription] Transcribing \${audioPath} in \${languageCode}...\`);
    const speech = await import('@google-cloud/speech');
    const client = new speech.v1.SpeechClient();
    const fs = await import('fs');
    const audioBytes = fs.readFileSync(audioPath).toString('base64');

    const request = {
      audio: { content: audioBytes },
      config: {
        encoding: 'LINEAR16' as const,
        sampleRateHertz: 24000,
        languageCode: languageCode,
        enableWordTimeOffsets: true,
      },
    };

    try {
      const [response] = await client.recognize(request);
      const timestamps: Array<{ word: string, startTime: number, endTime: number }> = [];

      if (!response.results) return timestamps;

      for (const result of response.results) {
        if (!result.alternatives || result.alternatives.length === 0) continue;
        const words = result.alternatives[0].words;
        if (!words) continue;

        for (const wordInfo of words) {
          const startTime = Number(wordInfo.startTime?.seconds || 0) + (wordInfo.startTime?.nanos || 0) / 1e9;
          const endTime = Number(wordInfo.endTime?.seconds || 0) + (wordInfo.endTime?.nanos || 0) / 1e9;
          if (wordInfo.word) {
            timestamps.push({ word: wordInfo.word, startTime, endTime });
          }
        }
      }
      
      console.log(\`[Transcription] Completed. Found \${timestamps.length} words.\`);
      return timestamps;
    } catch (error: any) {
      console.warn(\`[Transcription] Failed to transcribe: \${error.message}\`);
      return [];
    }
  }

`;
  code = code.replace(/\/\/ 3\. Lyria - Music/, transcribeAudioCode + '// 3. Lyria - Music');
}

fs.writeFileSync(path, code);
console.log('Fixed typescript errors');
