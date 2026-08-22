#!/usr/bin/env node
// Trims every video attachment in allure-results down to its LAST N seconds
// (default 3, per the roadmap: "short videos, up to 3s, on failure").
//
// Playwright records the whole test; the interesting part is always the end —
// the moment it failed. Trimming in place keeps the Allure JSON valid: the
// result files reference attachments by filename, which doesn't change.
//
// Videos exist only for failures (video: 'retain-on-failure'), so on a green
// run this is a no-op. ffmpeg is preinstalled on GitHub's ubuntu runners.
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const dir = process.argv[2] || 'allure-results';
const seconds = Number(process.argv[3] || 3);

if (!fs.existsSync(dir)) {
  console.log(`${dir} does not exist — nothing to trim.`);
  process.exit(0);
}

const videos = fs.readdirSync(dir).filter(f => f.endsWith('.webm'));
if (!videos.length) {
  console.log('No videos in allure-results (green run) — nothing to trim.');
  process.exit(0);
}

let trimmed = 0;
for (const name of videos) {
  const file = path.join(dir, name);
  const tmp = path.join(dir, `.trim-${name}`);
  try {
    // -sseof takes the last N seconds; re-encode (not -c copy) so the clip
    // starts on a keyframe and actually plays in the report's player.
    execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-sseof', `-${seconds}`,
      '-i', file, '-c:v', 'libvpx-vp9', '-b:v', '600k', '-an', tmp], { stdio: 'inherit' });
    fs.renameSync(tmp, file);
    trimmed++;
  } catch (err) {
    // A clip already shorter than N seconds, or an ffmpeg hiccup: keep the
    // original rather than losing the evidence.
    console.warn(`  ${name}: kept untrimmed (${err.message.split('\n')[0]})`);
    if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
  }
}
console.log(`Trimmed ${trimmed}/${videos.length} video(s) to the last ${seconds}s.`);
