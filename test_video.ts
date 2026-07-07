import { VideoComposerService } from './src/services/video-composer.service.ts';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  const script = "This is a test script to see if subtitles show up.";
  const wordTimings = [
    { word: "This", startTime: 0.0, endTime: 0.5 },
    { word: "is", startTime: 0.5, endTime: 1.0 },
    { word: "a", startTime: 1.0, endTime: 1.5 },
    { word: "test", startTime: 1.5, endTime: 2.0 },
    { word: "script", startTime: 2.0, endTime: 3.0 },
  ];
  const subsPath = await VideoComposerService.generateSubtitlesFile(script, 3.0, wordTimings);
  console.log("Subs generated at:", subsPath);
  
  const blankVideo = "/tmp/blank.mp4";
  execSync(`ffmpeg -y -f lavfi -i color=c=blue:s=720x1280:d=3 -c:v libx264 ${blankVideo}`);
  
  const { outputPath } = await VideoComposerService.mergeAudioVideo(blankVideo, null, subsPath, undefined, undefined, 3, "LLM Watermark");
  console.log("Final video at:", outputPath);
}
main();
