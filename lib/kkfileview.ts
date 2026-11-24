import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * kkFileView integration (server side).
 *
 * kkFileView previews a file by fetching its URL from the kkFileView server,
 * which holds no Pi Web session cookie. The signed token in the URL authorizes
 * exactly one file's `download` for a short TTL (the files route verifies the
 * binding; proxy.ts only lets token-bearing file GETs through to it). The
 * default Pi Web password is the HMAC key, so tokens die with it.
 */

export const KK_FILE_TOKEN_TTL_MS = 10 * 60 * 1000;

const DEFAULT_PI_WEB_PORT = 30141;

export function getKkFileViewBaseUrl(env: NodeJS.ProcessEnv = process.env): string | null {
  const base = env.KKFILEVIEW_BASE_URL?.trim();
  if (!base) return null;
  return base.replace(/\/+$/, "");
}

/** The pi-web origin the kkFileView server fetches file URLs from. Loopback covers a same-host deployment; override for a remote one. */
export function getKkFileViewFileOrigin(env: NodeJS.ProcessEnv = process.env): string {
  const origin = env.KKFILEVIEW_FILE_ORIGIN?.trim();
  if (origin) return origin.replace(/\/+$/, "");
  const port = /^\d+$/.test(env.PI_WEB_PORT ?? "") ? env.PI_WEB_PORT : String(DEFAULT_PI_WEB_PORT);
  return `http://127.0.0.1:${port}`;
}

function tokenSignature(payload: string, key: string): string {
  return createHmac("sha256", key).update(`pi-web-kkfile:${payload}`, "utf8").digest("base64url");
}

export function createKkFileToken(filePath: string, key: string, nowMs = Date.now(), ttlMs = KK_FILE_TOKEN_TTL_MS): string {
  const payload = `${nowMs + ttlMs}.${Buffer.from(filePath, "utf8").toString("base64url")}`;
  return `${payload}.${tokenSignature(payload, key)}`;
}

/** True when the token was signed by `key`, is unexpired, and names exactly `filePath`. */
export function isValidKkFileToken(token: string | null | undefined, filePath: string, key: string, nowMs = Date.now()): boolean {
  if (!token || !key) return false;
  const dot = token.indexOf(".");
  const sigSeparator = dot < 0 ? -1 : token.indexOf(".", dot + 1);
  if (sigSeparator < 0) return false;
  const payload = token.slice(0, sigSeparator);
  const signature = token.slice(sigSeparator + 1);
  const expected = tokenSignature(payload, key);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return false;
  const first = payload.indexOf(".");
  if (first < 0) return false;
  const expiry = Number(payload.slice(0, first));
  if (!Number.isSafeInteger(expiry) || expiry <= nowMs) return false;
  let tokenPath: string;
  try {
    tokenPath = Buffer.from(payload.slice(first + 1), "base64url").toString("utf8");
  } catch {
    return false;
  }
  return tokenPath === filePath;
}

/**
 * The preview URL kkFileView itself opens: its `/onlinePreview` page with the
 * signed file URL, base64-encoded the way kkFileView expects.
 */
export function buildKkPreviewUrl(filePath: string, env: NodeJS.ProcessEnv = process.env, nowMs = Date.now()): string | null {
  const base = getKkFileViewBaseUrl(env);
  if (!base) return null;
  const key = env.PI_WEB_PASSWORD ?? "";
  const fileUrl = `${getKkFileViewFileOrigin(env)}/api/files/${encodePathSegments(filePath)}?type=download&token=${encodeURIComponent(createKkFileToken(filePath, key, nowMs))}`;
  const encoded = Buffer.from(fileUrl, "utf8").toString("base64");
  return `${base}/onlinePreview?url=${encodeURIComponent(encoded)}`;
}

/** Same encoding the client uses for `/api/files/...` catch-all paths (lib/file-paths.ts). */
function encodePathSegments(filePath: string): string {
  const normalized = filePath.replace(/\\/g, "/");
  const segments = normalized.split("/").filter(Boolean);
  if (normalized.startsWith("//") && segments.length > 0) {
    segments[0] = `//${segments[0]}`;
  }
  return segments.map(encodeURIComponent).join("/");
}
