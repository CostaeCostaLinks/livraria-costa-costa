import { supabase } from '@/lib/supabase';

const BUCKET = 'books';
const SIGNED_URL_TTL_SECONDS = 60 * 60;

export function getStorageObjectPath(value?: string | null) {
  if (!value) return null;

  const cleanValue = value.split('?')[0];
  const markers = [
    '/storage/v1/object/public/books/',
    '/storage/v1/object/sign/books/',
  ];

  for (const marker of markers) {
    const markerIndex = cleanValue.indexOf(marker);
    if (markerIndex >= 0) {
      return decodeURIComponent(cleanValue.slice(markerIndex + marker.length));
    }
  }

  if (/^https?:\/\//i.test(cleanValue)) return null;
  return cleanValue.replace(/^\/+/, '');
}

export async function createSignedStorageUrl(value?: string | null) {
  const path = getStorageObjectPath(value);
  if (!path) return value || null;

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(path, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;
  return data.signedUrl;
}

export async function signStorageUrls(values: Array<string | null | undefined>) {
  const uniquePaths = Array.from(
    new Set(
      values
        .map((value) => getStorageObjectPath(value))
        .filter((path): path is string => Boolean(path))
    )
  );

  if (uniquePaths.length === 0) return new Map<string, string>();

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(uniquePaths, SIGNED_URL_TTL_SECONDS);

  if (error) throw error;

  const urlByPath = new Map<string, string>();
  for (const item of data || []) {
    if (item.path && item.signedUrl) {
      urlByPath.set(item.path, item.signedUrl);
    }
  }

  return urlByPath;
}

export function resolveSignedUrl(
  originalValue: string | null | undefined,
  signedByPath: Map<string, string>
) {
  const path = getStorageObjectPath(originalValue);
  if (!path) return originalValue || null;
  return signedByPath.get(path) || null;
}
