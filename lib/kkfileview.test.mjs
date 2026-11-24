import assert from "node:assert/strict";
import test from "node:test";

const { createKkFileToken, isValidKkFileToken, buildKkPreviewUrl, getKkFileViewBaseUrl, getKkFileViewFileOrigin } = await import("./kkfileview.ts");

const KEY = "test-password";
const FILE = "/tmp/workspace/report.docx";
const NOW = 1_700_000_000_000;

test("a fresh token validates for its own file", () => {
  const token = createKkFileToken(FILE, KEY, NOW);
  assert.equal(isValidKkFileToken(token, FILE, KEY, NOW + 1000), true);
});

test("an expired token is refused", () => {
  const token = createKkFileToken(FILE, KEY, NOW, 1000);
  assert.equal(isValidKkFileToken(token, FILE, KEY, NOW + 2000), false);
});

test("a token is bound to its exact file path", () => {
  const token = createKkFileToken(FILE, KEY, NOW);
  assert.equal(isValidKkFileToken(token, "/tmp/workspace/other.docx", KEY, NOW), false);
  assert.equal(isValidKkFileToken(token, "/tmp/workspace/report.docx ", KEY, NOW), false);
});

test("a token signed with another key is refused", () => {
  const token = createKkFileToken(FILE, KEY, NOW);
  assert.equal(isValidKkFileToken(token, FILE, "other-password", NOW), false);
});

test("garbage tokens are refused without throwing", () => {
  for (const token of [null, undefined, "", "abc", "a.b", "1.a.b", `${NOW}.a.${"x".repeat(10)}`]) {
    assert.equal(isValidKkFileToken(token, FILE, KEY, NOW), false);
  }
});

test("windows and UNC paths round-trip through a token", () => {
  for (const filePath of ["C:\\workspace\\report.docx", "\\\\host\\share\\a.docx"]) {
    const token = createKkFileToken(filePath, KEY, NOW);
    assert.equal(isValidKkFileToken(token, filePath, KEY, NOW), true);
  }
});

test("the preview URL embeds the base64 of a signed file URL", () => {
  const env = { KKFILEVIEW_BASE_URL: "http://127.0.0.1:8012/", PI_WEB_PASSWORD: KEY, PI_WEB_PORT: "30141" };
  const url = buildKkPreviewUrl("/tmp/报告.docx", env, NOW);
  assert.ok(url?.startsWith("http://127.0.0.1:8012/onlinePreview?url="));
  const embedded = Buffer.from(decodeURIComponent(url.split("url=")[1]), "base64").toString("utf8");
  assert.ok(embedded.startsWith("http://127.0.0.1:30141/api/files/tmp/%E6%8A%A5%E5%91%8A.docx?type=download&token="));
  const token = new URL(embedded).searchParams.get("token");
  assert.equal(isValidKkFileToken(token, "/tmp/报告.docx", KEY, NOW), true);
});

test("a trailing slash in the file origin is trimmed", () => {
  const env = { KKFILEVIEW_FILE_ORIGIN: "http://192.168.1.5:30141/" };
  assert.equal(getKkFileViewFileOrigin(env), "http://192.168.1.5:30141");
});

test("the base URL is null when unconfigured, else trimmed", () => {
  assert.equal(getKkFileViewBaseUrl({}), null);
  assert.equal(getKkFileViewBaseUrl({ KKFILEVIEW_BASE_URL: " http://kk:8012///" }), "http://kk:8012");
});

test("the file origin defaults to loopback on the pi-web port", () => {
  assert.equal(getKkFileViewFileOrigin({}), "http://127.0.0.1:30141");
  assert.equal(getKkFileViewFileOrigin({ PI_WEB_PORT: "8080" }), "http://127.0.0.1:8080");
  assert.equal(getKkFileViewFileOrigin({ PI_WEB_PORT: "not-a-port" }), "http://127.0.0.1:30141");
});
