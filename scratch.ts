import ffmpeg from 'fluent-ffmpeg';
import * as path from 'path';
import * as os from 'os';

async function test() {
  const width = 720, height = 1280, fps = 25;
  const clip1 = 'clip1.mp4';
  const clip2 = 'clip2.mp4';
  const clip3 = 'clip3.mp4';
  
  console.log("Creating solid color videos to simulate inputs...");
  
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('color=c=red:s=720x1280:r=25:d=25')
      .inputFormat('lavfi')
      .outputOptions([
        `-vf scale=${width}:${height}:force_original_aspect_ratio=decrease,pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=${fps},tpad=stop_mode=clone:stop_duration=2`,
        '-c:v libx264', '-pix_fmt yuv420p', `-r ${fps}`, '-preset superfast'
      ])
      .save(clip1)
      .on('end', resolve).on('error', reject);
  });
  
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('color=c=blue:s=720x1280:r=25:d=1')
      .inputFormat('lavfi')
      .inputOptions(['-loop 1'])
      .outputOptions([
        `-t 6`,
        `-vf scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,setsar=1,zoompan=z='min(zoom+0.0006,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`,
        '-c:v libx264', '-pix_fmt yuv420p', `-r ${fps}`, '-preset superfast'
      ])
      .save(clip2)
      .on('end', resolve).on('error', reject);
  });
  
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input('color=c=green:s=720x1280:r=25:d=1')
      .inputFormat('lavfi')
      .inputOptions(['-loop 1'])
      .outputOptions([
        `-t 6`,
        `-vf scale=1440:2560:force_original_aspect_ratio=increase,crop=1440:2560,setsar=1,zoompan=z='min(zoom+0.0006,1.5)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=${width}x${height}:fps=${fps}`,
        '-c:v libx264', '-pix_fmt yuv420p', `-r ${fps}`, '-preset superfast'
      ])
      .save(clip3)
      .on('end', resolve).on('error', reject);
  });

  console.log("Running concatVideos...");
  const outPath = 'concat_out.mp4';
  await new Promise((resolve, reject) => {
    const proc = ffmpeg();
    proc.input(clip1);
    proc.input(clip2);
    proc.input(clip3);
    
    const transitionDuration = 0.5;
    
    // offset 1: accumulated=25. offset = 25 - 0.5 = 24.5
    // offset 2: accumulated=25+4=29. offset = 29 - 1.0 = 28.0
    const filterString = `[0:v][1:v]xfade=transition=zoomin:duration=${transitionDuration}:offset=24.5[v_trans_0];[v_trans_0][2:v]xfade=transition=zoomin:duration=${transitionDuration}:offset=28.0[v_trans_1];`;
    
    proc.complexFilter([filterString])
      .map('[v_trans_1]')
      .videoCodec('libx264')
      .outputOptions(['-pix_fmt yuv420p', '-preset superfast'])
      .on('start', cmd => console.log(cmd))
      .on('error', (err, stdout, stderr) => { console.error(err); console.error(stderr); reject(err); })
      .on('end', resolve)
      .save(outPath);
  });
  
  console.log("Done");
}

test().catch(console.error);
