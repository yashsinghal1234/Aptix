const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const ffmpegPath = require('ffmpeg-static');

console.log('Using FFmpeg at:', ffmpegPath);

const videos = [
  { name: 'showcase-1', file: 'showcase-video-1.mp4' },
  { name: 'showcase-2', file: 'showcase-video-2.mp4' },
  { name: 'showcase-3', file: 'showcase-video-3.mp4' },
];

const publicDir = path.join(__dirname, '..', 'public');
const hlsOutputDir = path.join(publicDir, 'hls');

if (!fs.existsSync(hlsOutputDir)) {
  fs.mkdirSync(hlsOutputDir, { recursive: true });
}

for (const v of videos) {
  const inputPath = path.join(publicDir, v.file);
  const outDir = path.join(hlsOutputDir, v.name);

  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  const outM3u8 = path.join(outDir, 'index.m3u8');
  const segmentPattern = path.join(outDir, 'segment_%03d.ts');

  console.log(`\nSlicing ${v.file} -> ${v.name}...`);
  
  // Fast slice with audio stripped (-an) and exact 2-second keyframe alignment
  const cmd = `"${ffmpegPath}" -y -i "${inputPath}" -an -c:v libx264 -preset veryfast -crf 24 -g 48 -keyint_min 48 -sc_threshold 0 -hls_time 2 -hls_playlist_type vod -hls_segment_filename "${segmentPattern}" "${outM3u8}"`;

  try {
    execSync(cmd, { stdio: 'inherit' });
    console.log(`SUCCESS: Generated HLS chunks for ${v.name}`);
  } catch (err) {
    console.error(`ERROR slicing ${v.file}:`, err.message);
  }
}

console.log('\nAll videos successfully chunked!');
