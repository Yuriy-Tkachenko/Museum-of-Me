import "server-only";
import sharp from "sharp";
import { HttpError, limitedBody } from "@/lib/security";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export function isPexelsImage(value: string) {
  try {
    const url = new URL(value);
    return value.length <= 2048 && url.protocol === "https:" && url.hostname === "images.pexels.com" && !url.port && !url.username && !url.password && /^\/photos\/\d+\/[^/]+$/.test(url.pathname);
  } catch { return false; }
}

export async function normalizeUpload(file: File, { maxEdge = 1600, quality = 82 } = {}) {
  if (file.size > 4 * 1024 * 1024) throw new HttpError(413, "Image must be smaller than 4 MB.");
  const types: Record<string, string> = { "image/jpeg": "jpeg", "image/png": "png", "image/webp": "webp" };
  if (!types[file.type]) throw new HttpError(415, "Use a JPEG, PNG, or WebP image.");
  try {
    const input = Buffer.from(await file.arrayBuffer());
    // Reject SVG/polyglots with misleading MIME, animation, and decompression bombs.
    const image = sharp(input, { limitInputPixels: 25_000_000, failOn: "warning" });
    const metadata = await image.metadata();
    if (metadata.format !== types[file.type] || (metadata.pages ?? 1) > 1) throw new Error("Invalid image");
    const normalized = await image.rotate().resize({ width: maxEdge, height: maxEdge, fit: "inside", withoutEnlargement: true }).webp({ quality }).toBuffer();
    if (normalized.length > 4 * 1024 * 1024) throw new Error("Normalized image is too large");
    return normalized;
  } catch { throw new HttpError(415, "This image could not be safely processed."); }
}

// Call only for the authenticated owner, or after the gallery has opened.
export async function portraitImageUrl(value: string | null | undefined, ownerId: string) {
  if (!value || !/^[a-f0-9-]{36}$/.test(ownerId) || !new RegExp(`^portraits/${ownerId}/[a-f0-9-]{36}/portrait\\.webp$`).test(value)) return null;
  const { data, error } = await createSupabaseAdminClient().storage.from("portraits").createSignedUrl(value, 3600);
  return error ? null : data.signedUrl;
}

// Call only AFTER checking the museum is unlocked. Never render arbitrary stored URLs.
export async function publicImageUrl(value: string | null, museumId: string) {
  if (!value) return null;
  if (isPexelsImage(value)) return value;
  let path = value;
  // Existing uploads used public URLs; migrate their representation on read.
  const prefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/exhibits/`;
  if (path.startsWith(prefix)) path = path.slice(prefix.length);
  if (!new RegExp(`^exhibits/${museumId}/[a-f0-9-]{36}/exhibit\\.webp$`).test(path)) return null;
  const { data, error } = await createSupabaseAdminClient().storage.from("exhibits").createSignedUrl(path, 300);
  return error ? null : data.signedUrl;
}

// next/og cannot decode WebP. Fetch only verified public-gallery URLs and embed
// bounded JPEG bytes so its renderer never follows remote redirects or logs signed URLs.
export async function posterImage(value: string | null) {
  if (!value) return null;
  try {
    const url = new URL(value);
    const storageOrigin = process.env.NEXT_PUBLIC_SUPABASE_URL ? new URL(process.env.NEXT_PUBLIC_SUPABASE_URL).origin : "";
    const signedUpload = url.origin === storageOrigin && /^\/storage\/v1\/object\/sign\/exhibits\/exhibits\/[a-f0-9-]{36}\/[a-f0-9-]{36}\/exhibit\.webp$/.test(url.pathname) && !url.username && !url.password;
    if (!isPexelsImage(value) && !signedUpload) return null;
    const response = await fetch(value, { redirect: "error", signal: AbortSignal.timeout(8000), cache: "no-store" });
    if (!response.ok) return null;
    const bytes = await limitedBody(response, 6 * 1024 * 1024);
    const image = sharp(bytes, { limitInputPixels: 25_000_000, failOn: "warning" });
    const meta = await image.metadata();
    if (!["jpeg", "png", "webp"].includes(meta.format ?? "") || (meta.pages ?? 1) > 1) return null;
    const jpg = await image.rotate().resize({ width: 640, height: 640, fit: "inside", withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch { return null; }
}
