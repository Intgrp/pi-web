import { NextRequest, NextResponse } from "next/server";
import fs from "fs";
import { getAllowedFileRoots, isFilePathAllowed } from "@/lib/file-access";
import { isExistingFilePathAllowed } from "@/lib/file-access";
import { hasParentDirectorySegment } from "@/lib/path-security";
import { isFilePathReferencedBySession } from "@/lib/session-file-references";
import { buildKkPreviewUrl, getKkFileViewBaseUrl } from "@/lib/kkfileview";

/**
 * kkFileView bridge. Without `path`, a capability probe for the client:
 * `{ enabled }`. With `path`, a ready-to-open preview URL whose embedded file
 * URL carries a short-lived token bound to that one file (lib/kkfileview.ts).
 */
export async function GET(request: NextRequest) {
  const base = getKkFileViewBaseUrl();
  if (!base) return NextResponse.json({ enabled: false });

  const filePath = request.nextUrl.searchParams.get("path");
  if (!filePath) return NextResponse.json({ enabled: true });
  if (hasParentDirectorySegment(filePath)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const sessionId = request.nextUrl.searchParams.get("sessionId");
  const allowedRoots = await getAllowedFileRoots();
  const allowedByRoot = isFilePathAllowed(filePath, allowedRoots);
  const allowedBySessionReference =
    !allowedByRoot && await isFilePathReferencedBySession(filePath, sessionId);
  if (!allowedByRoot && !allowedBySessionReference) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  let stat: fs.Stats;
  try {
    stat = fs.statSync(filePath);
  } catch {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }
  if (!stat.isFile()) {
    return NextResponse.json({ error: "Not a file" }, { status: 400 });
  }
  if (!allowedBySessionReference && !isExistingFilePathAllowed(filePath, allowedRoots)) {
    return NextResponse.json({ error: "Access denied" }, { status: 403 });
  }

  const url = buildKkPreviewUrl(filePath);
  if (!url) return NextResponse.json({ enabled: false });
  return NextResponse.json({ enabled: true, url });
}
