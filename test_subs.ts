import { VideoComposerService } from './src/services/video-composer.service.ts';
import fs from 'fs';

async function main() {
  const script = "This is a test script to see if the subtitle generator works perfectly in fallback mode.";
  const path = await VideoComposerService.generateSubtitlesFile(script, 10, []);
  console.log("ASS FILE WRITTEN TO:", path);
  console.log(fs.readFileSync(path, 'utf8'));
}
main();
