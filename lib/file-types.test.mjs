import assert from "node:assert/strict";
import test from "node:test";

async function loadSubject() {
  return import("./file-types.ts");
}

test("detects image, audio, and document preview paths", async () => {
  const {
    getAudioMime,
    getDocumentMime,
    getImageMime,
    isAudioPath,
    isDocumentPreviewPath,
    isImagePath,
  } = await loadSubject();

  assert.equal(getImageMime("/tmp/screenshot.PNG"), "image/png");
  assert.equal(getAudioMime("C:\\Users\\me\\voice.OPUS"), "audio/ogg");
  assert.equal(getDocumentMime("/tmp/report.docx"), "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
  assert.equal(isImagePath("/tmp/screenshot.PNG"), true);
  assert.equal(isAudioPath("C:\\Users\\me\\voice.OPUS"), true);
  assert.equal(isDocumentPreviewPath("/tmp/report.pdf"), true);
  assert.equal(isDocumentPreviewPath("/tmp/report.txt"), false);
});

test("detects video preview paths and treats webm as video", async () => {
  const { getAudioMime, getVideoMime, isVideoPath } = await loadSubject();

  assert.equal(getVideoMime("/tmp/clip.MP4"), "video/mp4");
  assert.equal(getVideoMime("C:\\Users\\me\\recording.webm"), "video/webm");
  assert.equal(getVideoMime("/tmp/movie.mov"), "video/quicktime");
  assert.equal(getVideoMime("/tmp/notes.txt"), null);
  assert.equal(isVideoPath("/tmp/clip.mp4"), true);
  assert.equal(isVideoPath("/tmp/song.mp3"), false);
  assert.equal(getAudioMime("/tmp/recording.webm"), null);
  assert.equal(getAudioMime("/tmp/voice.weba"), "audio/webm");
});

test("extracts extensions from mixed path styles", async () => {
  const { documentPreviewKind, getFileExt } = await loadSubject();

  assert.equal(getFileExt("/tmp/archive.tar.gz"), "gz");
  assert.equal(getFileExt("C:\\Users\\me\\photo.AVIF"), "avif");
  assert.equal(documentPreviewKind("/tmp/manual.PDF"), "pdf");
  assert.equal(documentPreviewKind("/tmp/manual.md"), null);
});

test("serves a .pdf as application/pdf only, which the PDF navigation allowance relies on", async () => {
  const { getAudioMime, getDocumentMime, getImageMime, getVideoMime } = await loadSubject();

  assert.equal(getImageMime("/tmp/paper.PDF"), null);
  assert.equal(getAudioMime("/tmp/paper.PDF"), null);
  assert.equal(getVideoMime("/tmp/paper.PDF"), null);
  assert.equal(getDocumentMime("/tmp/paper.PDF"), "application/pdf");
});

test("kkFileView support matches its FileType map, unknown suffixes fall back to text", async () => {
  const { isKkFileViewSupportedExt } = await loadSubject();

  for (const supported of ["/tmp/report.docx", "/tmp/表格.xlsx", "/tmp/doc.pdf", "/tmp/notes.md", "/tmp/script.sh", "/tmp/图.png", "/tmp/archive.zip"]) {
    assert.equal(isKkFileViewSupportedExt(supported), true, supported);
  }
  for (const unsupported of ["/tmp/pip.conf", "/tmp/.gitignore", "/tmp/Dockerfile", "/tmp/data.xyz", "/tmp/LICENSE"]) {
    assert.equal(isKkFileViewSupportedExt(unsupported), false, unsupported);
  }
});

test("kkFileView support matches its FileType map, unknown suffixes fall back to text", async () => {
  const { isKkFileViewSupportedExt } = await loadSubject();

  for (const supported of ["/tmp/report.docx", "/tmp/表格.xlsx", "/tmp/doc.pdf", "/tmp/notes.md", "/tmp/script.sh", "/tmp/图.png", "/tmp/archive.zip"]) {
    assert.equal(isKkFileViewSupportedExt(supported), true, supported);
  }
  for (const unsupported of ["/tmp/pip.conf", "/tmp/.gitignore", "/tmp/Dockerfile", "/tmp/data.xyz", "/tmp/LICENSE"]) {
    assert.equal(isKkFileViewSupportedExt(unsupported), false, unsupported);
  }
});
