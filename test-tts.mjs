import textToSpeech from '@google-cloud/text-to-speech';
import fs from 'fs';

async function test() {
  const client = new textToSpeech.TextToSpeechClient();
  const request = {
    input: { text: 'Hello world' },
    voice: { languageCode: 'en-US', name: 'en-US-Journey-D' },
    audioConfig: { audioEncoding: 'LINEAR16' },
  };
  const [response] = await client.synthesizeSpeech(request);
  fs.writeFileSync('test.wav', response.audioContent, 'binary');
  console.log("Success! Saved test.wav");
}
test().catch(console.error);
