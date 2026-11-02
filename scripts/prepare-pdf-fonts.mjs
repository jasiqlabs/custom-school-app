#!/usr/bin/env node
/**
 * Prepare the three pinned OFL Noto fonts for deterministic offline document rendering.
 * Build-time only; the application never fetches fonts or sends school data to a font API.
 * SHA-1 below is the Git blob hash of the exact binary, not an arbitrary downloaded file.
 */
import { createHash } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const pin = 'ffebf8c1ee449e544955a7e813c54f9b73848eac';
const fontDir = resolve(process.cwd(), 'assets/pdf-fonts');
const fonts = [
  ['NotoSans', 'd55220958aa51eeeb85048d746eabe43d2cd9f14'],
  ['NotoSansDevanagari', 'd9167f632b699b82eb81e0e0ad1ddb89bcdbd6c3'],
  ['NotoNaskhArabic', '0259f6672e2a55a2de7a08ccca8c1eb763e585f3'],
];

function blobHash(bytes) {
  const prefix = Buffer.from('blob ' + bytes.length + '\0');
  return createHash('sha1').update(prefix).update(bytes).digest('hex');
}
async function download(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const response = await fetch(url, { signal: controller.signal, redirect: 'error' });
    if (!response.ok) throw new Error('Font download failed with HTTP ' + response.status);
    const size = Number(response.headers.get('content-length') || 0);
    if (size > 900_000) throw new Error('Font exceeds the expected size');
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length < 10000 || bytes.length > 900000) throw new Error('Unexpected font size');
    return bytes;
  } finally {
    clearTimeout(timeout);
  }
}
await mkdir(fontDir, { recursive: true });
for (const [name, expectedSha] of fonts) {
  const dest = join(fontDir, name + '-Regular.ttf');
  try {
    const bytes = await readFile(dest);
    if (blobHash(bytes) === expectedSha) {
      console.log('Verified cached document font: ' + name);
      continue;
    }
  } catch { /* Font not cached yet. */ }
  const url = 'https://raw.githubusercontent.com/notofonts/noto-fonts/' + pin +
    '/hinted/ttf/' + name + '/' + name + '-Regular.ttf';
  const data = await download(url);
  if (blobHash(data) !== expectedSha) throw new Error('Document font integrity failed: ' + name);
  const temp = dest + '.tmp-' + process.pid;
  await writeFile(temp, data, { mode: 0o644 });
  await rename(temp, dest);
  console.log('Installed verified document font: ' + name);
}
// Fontconfig loads fonts from this private directory without root or OS package installs.
// The file is relocatable: the directory is resolved at generation time by the renderer.
const xml = '<?xml version="1.0"?>\n' +
  '<!DOCTYPE fontconfig SYSTEM "fonts.dtd">\n<fontconfig>\n' +
  '  <dir>' + fontDir.replaceAll('&', '&amp;').replaceAll('<', '&lt;') + '</dir>\n' +
  '</fontconfig>\n';
await writeFile(join(fontDir, 'fonts.conf'), xml);
console.log('Document fonts ready (Noto family; OFL-1.1; pinned upstream commit ' + pin.slice(0, 8) + ')');
