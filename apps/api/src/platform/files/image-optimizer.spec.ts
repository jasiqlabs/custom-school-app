import sharp from 'sharp';
import { optimizePrivateImage, MAX_STORED_IMAGE_BYTES, MAX_IMAGE_UPLOAD_BYTES } from './image-optimizer';

describe('private image optimization', () => {
  it('preserves an already-small PNG byte for byte', async () => {
    const original = await sharp({
      create: { width: 100, height: 100, channels: 4, background: { r: 255, g: 0, b: 0, alpha: 0.3 } },
    }).png().toBuffer();
    const result = await optimizePrivateImage(original, 'image/png');
    expect(result.buffer).toEqual(original);
    expect(result.mime).toBe('image/png');
  });

  it('keeps large photographic JPEG uploads under 500 KiB', async () => {
    const width = 1400, height = 1000;
    const pixels = Buffer.allocUnsafe(width * height * 3);
    for (let i = 0; i < pixels.length; i++) pixels[i] = (i * 17 + Math.floor(i / 71) * 29) & 255;
    const original = await sharp(pixels, { raw: { width, height, channels: 3 } })
      .jpeg({ quality: 98 }).toBuffer();
    expect(original.length).toBeGreaterThan(MAX_STORED_IMAGE_BYTES);
    const result = await optimizePrivateImage(original, 'image/jpeg');
    expect(result.buffer.length).toBeLessThanOrEqual(MAX_STORED_IMAGE_BYTES);
    expect((await sharp(result.buffer).metadata()).format).toBe('jpeg');
    expect(result.mime).toBe('image/jpeg');
  });

  it('keeps PNG alpha and truecolor output compatible with certificate PDFs', async () => {
    const width = 700, height = 600;
    const pixels = Buffer.allocUnsafe(width * height * 4);
    for (let i = 0; i < pixels.length; i += 4) {
      pixels[i] = (i * 11 + i / 4) & 255;
      pixels[i+1] = (i * 7 + i / 12) & 255;
      pixels[i+2] = (i * 19 + i / 8) & 255;
      pixels[i+3] = 127;
    }
    const original = await sharp(pixels, { raw: { width, height, channels: 4 } })
      .png({ palette: false }).toBuffer();
    expect(original.length).toBeGreaterThan(MAX_STORED_IMAGE_BYTES);
    const result = await optimizePrivateImage(original, 'image/png');
    expect(result.buffer.length).toBeLessThanOrEqual(MAX_STORED_IMAGE_BYTES);
    expect(result.mime).toBe('image/png');
    const meta = await sharp(result.buffer).metadata();
    expect(meta.hasAlpha).toBe(true);
    expect(result.buffer[24]).toBe(8); // 8-bit PNG
    expect(result.buffer[25]).toBe(6); // RGBA, not indexed/palette
    expect(result.buffer[28]).toBe(0); // no interlacing
  });

  it('rejects oversized or corrupted content and incorrect MIME types', async () => {
    await expect(optimizePrivateImage(Buffer.alloc(MAX_IMAGE_UPLOAD_BYTES + 1), 'image/png'))
      .rejects.toMatchObject({ status: 413 });
    await expect(optimizePrivateImage(Buffer.from('not an image'), 'image/png'))
      .rejects.toMatchObject({ status: 415 });
    const tiny = await sharp({ create: { width: 8, height: 8, channels: 3, background: '#fff' } })
      .jpeg().toBuffer();
    await expect(optimizePrivateImage(tiny, 'image/png'))
      .rejects.toMatchObject({ status: 415 });
  });
});
