#!/usr/bin/env node
/**
 * Downloads placeholder images for every project into public/images/projects/<slug>/
 * and generates small thumbnails in public/images/projects/<slug>/thumbs/.
 *
 *   npm run fetch:images            -> download missing files, (re)build thumbs
 *   npm run fetch:images -- --force -> re-download everything
 *
 * Source: https://picsum.photos/seed/<slug>-<n>/1600/1000  (cover = n 0, 01.webp = n 1, ...)
 *
 * To use your own images: drop files into the project folder using the SAME filenames
 * (cover.webp, 01.webp, ...) and re-run this script to rebuild the thumbnails.
 * If `sharp` is not installed, originals are saved as .jpg and the project JSON is
 * updated to point at the .jpg files (no thumbnails are generated in that case).
 */
import { readdir, readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { join, dirname, basename, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const contentDir = join(root, 'src/content/projects');
const publicDir = join(root, 'public');
const force = process.argv.includes('--force');
const WIDTH = 1600;
const HEIGHT = 1000;
const THUMB_WIDTH = 160;
const CONCURRENCY = 6;

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  console.warn('[fetch] sharp not available - saving JPGs and skipping thumbnails.');
}

const exists = (p) => access(p).then(() => true, () => false);

/** cover -> 0, "01" -> 1, ... */
function seedIndex(file) {
  const name = basename(file, extname(file));
  return name === 'cover' ? 0 : parseInt(name, 10) || 0;
}

async function download(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return Buffer.from(await res.arrayBuffer());
    } catch (err) {
      if (attempt === 3) throw err;
      await new Promise((r) => setTimeout(r, 600 * attempt));
    }
  }
}

async function runPool(tasks, n) {
  const queue = [...tasks];
  const workers = Array.from({ length: n }, async () => {
    while (queue.length) await queue.shift()();
  });
  await Promise.all(workers);
}

const files = (await readdir(contentDir)).filter((f) => f.endsWith('.json')).sort();
const tasks = [];
const thumbJobs = [];
let downloaded = 0;

for (const file of files) {
  const jsonPath = join(contentDir, file);
  const project = JSON.parse(await readFile(jsonPath, 'utf8'));
  const ext = sharp ? '.webp' : '.jpg';
  // Normalise extension of every image path to what we can actually produce.
  const images = project.images.map((p) => {
    const disk = join(publicDir, p);
    return { url: p.replace(/\.(webp|jpe?g|png)$/i, ext), original: p, disk };
  });

  for (const img of images) {
    const target = join(publicDir, img.url);
    tasks.push(async () => {
      await mkdir(dirname(target), { recursive: true });
      const already = (await exists(target)) || (await exists(img.disk));
      if (already && !force) {
        if (!(await exists(target))) img.url = img.original; // keep user's own file + extension
      } else {
        const seed = `${project.slug}-${seedIndex(img.url)}`;
        const buf = await download(`https://picsum.photos/seed/${seed}/${WIDTH}/${HEIGHT}`);
        if (sharp) await sharp(buf).webp({ quality: 82 }).toFile(target);
        else await writeFile(target, buf);
        downloaded++;
        process.stdout.write('.');
      }
      if (sharp) thumbJobs.push(img.url);
    });
  }

  tasks.push(async () => {
    const urls = images.map((i) => i.url);
    if (JSON.stringify(urls) !== JSON.stringify(project.images) || project.cover !== urls[0]) {
      project.images = urls;
      project.cover = urls[0];
      await writeFile(jsonPath, JSON.stringify(project, null, 2) + '\n');
      console.log(`\n[fetch] updated ${file}`);
    }
  });
}

await runPool(tasks, CONCURRENCY);

if (sharp) {
  await runPool(
    thumbJobs.map((url) => async () => {
      const src = join(publicDir, url);
      const out = join(dirname(src), 'thumbs', basename(url).replace(/\.\w+$/, '.webp'));
      await mkdir(dirname(out), { recursive: true });
      await sharp(src).resize({ width: THUMB_WIDTH }).webp({ quality: 75 }).toFile(out);
    }),
    CONCURRENCY,
  );
}

console.log(`\n[fetch] done - ${downloaded} downloaded, ${thumbJobs.length} thumbnails built.`);
