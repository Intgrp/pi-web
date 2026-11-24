export const TEXT_PREVIEW_MAX_BYTES = 256 * 1024;
export const IMAGE_PREVIEW_MAX_BYTES = 10 * 1024 * 1024;
export const DOCX_PREVIEW_MAX_BYTES = 10 * 1024 * 1024;
export const HTML_PREVIEW_MAX_BYTES = 10 * 1024 * 1024;

export type DocumentPreviewKind = "pdf" | "docx";

export const IMAGE_EXT_TO_MIME: Record<string, string> = {
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  bmp: "image/bmp",
  ico: "image/x-icon",
  avif: "image/avif",
};

export const AUDIO_EXT_TO_MIME: Record<string, string> = {
  mp3: "audio/mpeg",
  wav: "audio/wav",
  ogg: "audio/ogg",
  oga: "audio/ogg",
  opus: "audio/ogg",
  m4a: "audio/mp4",
  aac: "audio/aac",
  flac: "audio/flac",
  weba: "audio/webm",
};

export const VIDEO_EXT_TO_MIME: Record<string, string> = {
  mp4: "video/mp4",
  m4v: "video/mp4",
  webm: "video/webm",
  mov: "video/quicktime",
  ogv: "video/ogg",
};

export const DOCUMENT_EXT_TO_MIME: Record<DocumentPreviewKind, string> = {
  pdf: "application/pdf",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
};

function getBaseName(filePath: string): string {
  return filePath.replace(/\\/g, "/").split("/").pop() ?? "";
}

export function getFileExt(filePath: string): string {
  const name = getBaseName(filePath).toLowerCase();
  const dot = name.lastIndexOf(".");
  return dot > 0 ? name.slice(dot + 1) : "";
}

export function getImageMime(filePath: string): string | null {
  const ext = getFileExt(filePath);
  return Object.hasOwn(IMAGE_EXT_TO_MIME, ext) ? IMAGE_EXT_TO_MIME[ext] : null;
}

export function getAudioMime(filePath: string): string | null {
  const ext = getFileExt(filePath);
  return Object.hasOwn(AUDIO_EXT_TO_MIME, ext) ? AUDIO_EXT_TO_MIME[ext] : null;
}

export function getVideoMime(filePath: string): string | null {
  const ext = getFileExt(filePath);
  return Object.hasOwn(VIDEO_EXT_TO_MIME, ext) ? VIDEO_EXT_TO_MIME[ext] : null;
}

export function getDocumentMime(filePath: string): string | null {
  const ext = getFileExt(filePath) as DocumentPreviewKind;
  return Object.hasOwn(DOCUMENT_EXT_TO_MIME, ext) ? DOCUMENT_EXT_TO_MIME[ext] : null;
}

export function documentPreviewKind(filePath: string): DocumentPreviewKind | null {
  const ext = getFileExt(filePath);
  if (ext === "pdf" || ext === "docx") return ext;
  return null;
}

export function isImagePath(filePath: string): boolean {
  return getImageMime(filePath) !== null;
}

export function isAudioPath(filePath: string): boolean {
  return getAudioMime(filePath) !== null;
}

export function isVideoPath(filePath: string): boolean {
  return getVideoMime(filePath) !== null;
}

export function isDocumentPreviewPath(filePath: string): boolean {
  return documentPreviewKind(filePath) !== null;
}

/**
 * Extensions kkFileView 5.0.3 can preview. Mirrors the suffix→FileType map in
 * its `model/FileType.java` (plus the default simText/media lists from
 * `application.properties`); anything else lands on kkFileView's "系统还不支持
 * 该格式文件的在线预览" page, so the preview-router defaults those to the
 * built-in text viewer instead (e.g. pip.conf).
 */
const KK_FILEVIEW_SUPPORTED_EXT = new Set([
  // OFFICE_TYPES
  "docx", "wps", "doc", "docm", "xls", "xlsx", "csv", "xlsm", "ppt", "pptx",
  "vsd", "rtf", "odt", "wmf", "emf", "dps", "et", "ods", "ots", "tsv", "odp",
  "otp", "sxi", "ott", "vsdx", "fodt", "fods", "xltx", "tga", "psd", "dotm",
  "ett", "xlt", "xltm", "wpt", "dot", "xlam", "dotx", "xla", "pages", "eps", "pptm",
  // PICTURE_TYPES
  "jpg", "jpeg", "png", "gif", "bmp", "ico", "jfif", "webp", "heic", "avif", "heif",
  // ARCHIVE_TYPES
  "rar", "zip", "jar", "7-zip", "tar", "gzip", "7z",
  // ONLINE3D_TYPES
  "obj", "3ds", "stl", "ply", "off", "3dm", "fbx", "dae", "wrl", "3mf", "ifc",
  "glb", "o3dv", "gltf", "stp", "bim", "fcstd", "step", "iges", "brep",
  // single-suffix types
  "eml", "msg", "xmind", "epub", "dcm", "drawio", "xml", "xbrl", "json",
  "tif", "tiff", "ofd", "svg", "dwg", "dxf", "dwf", "igs", "dwt", "dng",
  "dwfx", "cf2", "plt", "bpmn", "pdf",
  // CODE_TYPES
  "java", "c", "php", "go", "python", "py", "js", "html", "ftl", "css", "lua",
  "sh", "rb", "yaml", "yml", "h", "cpp", "cs", "aspx", "jsp", "sql",
  // default simText list (application.properties)
  "txt", "htm", "asp", "properties", "md", "gitignore", "log", "bat", "m", "bas", "prg", "cmd",
  // default media list (application.properties)
  "mp3", "wav", "mp4", "flv", "mpd", "m3u8", "ts", "mpeg", "m4a",
]);

export function isKkFileViewSupportedExt(filePath: string): boolean {
  return KK_FILEVIEW_SUPPORTED_EXT.has(getFileExt(filePath));
}
