import sharp from 'sharp';
import { ApiError } from '../../common/http/api-error';

/** 5 MiB incoming images, at most 500 KiB persisted. */
export const MAX_IMAGE_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_STORED_IMAGE_BYTES = 500 * 1024;
const MAX_INPUT_PIXELS = 20_000_000;

export type OptimizedImage = { buffer: Buffer; mime: string };

/**
 * Only optimize school-owned PNG/JPEG assets, before the private storage adapter.
 * Keep PNG as non-paletted 8-bit PNG: TC PDF rendering consumes PNG/JPEG itself
 * and cannot decode indexed-color PNGs. Never flatten transparent signatures.
 * Existing small images remain byte-for-byte unchanged.
 */
export async function optimizePrivateImage(buffer: Buffer, mime: string): Promise<OptimizedImage> {
  if (!Buffer.isBuffer(buffer) || buffer.length < 8 || buffer.length > MAX_IMAGE_UPLOAD_BYTES) {
    throw new ApiError(413, 'ERR_FILE_SIZE', 'Image must be 5 MB or smaller');
  }
  const png = buffer.subarray(0, 8).toString('hex') === '89504e470d0a1a0a';
  const jpeg = buffer[0] === 0xff && buffer[1] === 0xd8 &&
    buffer[buffer.length - 2] === 0xff && buffer[buffer.length - 1] === 0xd9;

  if (!png && !jpeg) {
    throw new ApiError(415, 'ERR_FILE_TYPE', 'Only PNG/JPEG images are allowed');
  }
  if ((png && mime !== 'image/png') || (jpeg && mime !== 'image/jpeg' && mime !== 'image/jpg')) {
    throw new ApiError(415, 'ERR_FILE_TYPE', 'MIME and file signature do not match');
  }

  let metadata: sharp.Metadata;
  try {
    metadata = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' }).metadata();
    if (!metadata.width || !metadata.height ||
      (png && metadata.format !== 'png') || (jpeg && metadata.format !== 'jpeg')) {
      throw new Error('Invalid PNG/JPEG image');
    }
  } catch {
    throw new ApiError(415, 'ERR_FILE_TYPE', 'Image is damaged or too large to process');
  }

  // Avoid unnecessary quality or format changes to already-compliant uploads.
  if (buffer.length <= MAX_STORED_IMAGE_BYTES) return { buffer, mime };

  // Progressively reduce dimensions only when recompression alone is insufficient.
  // JPEG remains JPEG; PNG remains PNG (including transparency).
  const maxEdge = Math.max(metadata.width, metadata.height);
  const edges = [maxEdge, 1600, 1200, 1000, 800, 640, 512, 384, 320, 256]
    .filter((edge, index, source) => edge > 0 && edge <= maxEdge && source.indexOf(edge) === index);

  try {
    for (const maxSize of edges) {
      if (jpeg) {
        for (const quality of [85, 76, 68]) {
          const optimized = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
            .rotate()
            .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality, progressive: false, mozjpeg: true })
            .toBuffer();
          if (optimized.length <= MAX_STORED_IMAGE_BYTES) {
            return { buffer: optimized, mime: 'image/jpeg' };
          }
        }
      } else {
        const optimized = await sharp(buffer, { limitInputPixels: MAX_INPUT_PIXELS, failOn: 'error' })
          .rotate()
          .resize({ width: maxSize, height: maxSize, fit: 'inside', withoutEnlargement: true })
          .png({ palette: false, compressionLevel: 9, progressive: false })
          .toBuffer();
        if (optimized.length <= MAX_STORED_IMAGE_BYTES) {
          return { buffer: optimized, mime: 'image/png' };
        }
      }
    }
  } catch {
    throw new ApiError(415, 'ERR_FILE_TYPE', 'Unable to process image');
  }

  throw new ApiError(413, 'ERR_IMAGE_COMPRESSION_LIMIT',
    'Image cannot be reduced below 500 KB without excessive quality loss; choose a simpler or smaller image');
}
