import { VideoComposerService } from './src/services/video-composer.service.ts';
import fs from 'fs';

async function main() {
  const script = "This is a test script.";
  const wordTimings = [
    { word: "This", startTime: 0.0, endTime: 0.5 },
    { word: "is", startTime: 0.5, endTime: 1.0 },
    { word: "a", startTime: 1.0, endTime: 1.5 },
    { word: "test", startTime: 1.5, endTime: 2.0 },
  ];
  const path = await VideoComposerService.generateSubtitlesFile(script, 10, wordTimings);
  console.log("ASS FILE WRITTEN TO:", path);
  console.log(fs.readFileSync(path, 'utf8'));
}
main();
