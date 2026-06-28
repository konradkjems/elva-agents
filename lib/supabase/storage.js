/**
 * Supabase Storage helper — replaces lib/cloudinary.js.
 *
 * Uploads run server-side with the service-role `admin` client. Buckets are
 * public (so OpenAI vision and the widget can read chat images by URL); tenant
 * isolation is enforced by the app, not by Storage policies.
 *
 * Buckets: widget-assets, chat-uploads, agent-avatars, demo-screenshots.
 * Path convention: `${organizationId}/${entityId}/${ts}.${ext}` (caller-built).
 */

import sharp from 'sharp';
import { admin } from './admin';

/**
 * Upload a buffer to a bucket and return its public URL.
 * @returns {Promise<{success:boolean, url?:string, bucket?:string, path?:string, error?:string}>}
 */
export async function uploadToStorage(bucket, path, body, contentType, { upsert = true } = {}) {
  try {
    const { error } = await admin.storage.from(bucket).upload(path, body, {
      contentType,
      upsert,
      cacheControl: '31536000', // 1 year — assets are content-addressed by timestamp
    });
    if (error) {
      console.error(`Storage upload error (${bucket}/${path}):`, error.message);
      return { success: false, error: error.message };
    }
    const { data } = admin.storage.from(bucket).getPublicUrl(path);
    return { success: true, url: data.publicUrl, bucket, path };
  } catch (error) {
    console.error('Storage upload exception:', error);
    return { success: false, error: error.message };
  }
}

/** Delete an object by bucket + path. */
export async function deleteFromStorage(bucket, path) {
  try {
    if (!bucket || !path) return { success: false, error: 'bucket and path required' };
    const { error } = await admin.storage.from(bucket).remove([path]);
    if (error) {
      console.error(`Storage delete error (${bucket}/${path}):`, error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

/**
 * Parse a Supabase public URL back into { bucket, path } so a stored URL can be
 * deleted. Returns null for non-Supabase URLs (e.g. legacy Cloudinary URLs),
 * which lets callers skip deletion safely.
 */
export function parseStorageUrl(publicUrl) {
  if (!publicUrl || typeof publicUrl !== 'string') return null;
  const marker = '/storage/v1/object/public/';
  const i = publicUrl.indexOf(marker);
  if (i === -1) return null;
  const rest = publicUrl.slice(i + marker.length);
  const slash = rest.indexOf('/');
  if (slash === -1) return null;
  return {
    bucket: rest.slice(0, slash),
    path: decodeURIComponent(rest.slice(slash + 1).split('?')[0]),
  };
}

/** Delete by public URL (no-op for non-Supabase URLs). */
export async function deleteByPublicUrl(publicUrl) {
  const parsed = parseStorageUrl(publicUrl);
  if (!parsed) return { success: false, skipped: true };
  return deleteFromStorage(parsed.bucket, parsed.path);
}

/**
 * Resize/normalize an image buffer with sharp. `fit: 'inside'` keeps aspect
 * ratio within max dimensions (no upscaling); `fit: 'cover'` crops to exact size
 * (avatars). Re-encodes to webp by default for size.
 */
export async function resizeImage(buffer, { width, height, fit = 'inside', format = 'webp', quality = 82 } = {}) {
  let pipeline = sharp(buffer).rotate(); // honour EXIF orientation
  pipeline = pipeline.resize({
    width,
    height,
    fit,
    withoutEnlargement: fit === 'inside',
  });
  if (format === 'webp') pipeline = pipeline.webp({ quality });
  else if (format === 'png') pipeline = pipeline.png();
  else if (format === 'jpeg') pipeline = pipeline.jpeg({ quality });
  const out = await pipeline.toBuffer();
  return { buffer: out, contentType: `image/${format}`, ext: format };
}
