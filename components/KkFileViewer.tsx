"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { getFileName, getRelativeFilePath, encodeFilePathForApi } from "@/lib/file-paths";
import { fileVersion, fileVersionChanged } from "@/lib/file-version";
import { HIDDEN_PAGE_GRACE_MS, usePageHiddenFor } from "@/hooks/usePageHidden";
import { trackEventSource } from "@/lib/page-debug";
import { useI18n } from "@/hooks/useI18n";
import { KkViewToggle } from "./KkViewToggle";

interface Props {
  filePath: string;
  cwd?: string;
  sourceSessionId?: string | null;
  /** Switch to the built-in viewer (the escape hatch from the kkFileView view). */
  onUseSource: () => void;
  watchEnabled?: boolean;
}

/**
 * External preview through a configured kkFileView server. The server signs a
 * short-lived file URL (`/api/files/kkfileview`), this component only embeds
 * the returned `/onlinePreview` address. A file watch re-signs and reloads the
 * frame when the file changes; kkFileView's own conversion cache may lag a
 * beat behind.
 */
export function KkFileViewer({ filePath, cwd, sourceSessionId, onUseSource, watchEnabled = true }: Props) {
  const { t } = useI18n();
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [watching, setWatching] = useState(false);
  const [bust, setBust] = useState(0);
  const esRef = useRef<EventSource | null>(null);
  const shownVersionRef = useRef<string | null>(null);
  const pageHidden = usePageHiddenFor(HIDDEN_PAGE_GRACE_MS);
  const watchActive = watchEnabled && !pageHidden;
  // A callback identity change must not re-sign; only `filePath`/`bust` do.
  const onUseSourceRef = useRef(onUseSource);
  onUseSourceRef.current = onUseSource;

  useEffect(() => {
    setPreviewUrl(null);
    setError(null);
    shownVersionRef.current = null;
    let active = true;
    const params = new URLSearchParams({ path: filePath });
    if (sourceSessionId) params.set("sessionId", sourceSessionId);
    if (bust > 0) params.set("v", String(bust));
    fetch(`/api/files/kkfileview?${params.toString()}`)
      .then((r) => r.json())
      .then((d: { enabled?: boolean; url?: string; error?: string }) => {
        if (!active) return;
        if (d.error) {
          setError(d.error);
          return;
        }
        // Not configured (any longer): fall back to the built-in viewers.
        if (!d.enabled) {
          onUseSourceRef.current();
          return;
        }
        setError(null);
        setPreviewUrl(d.url ?? null);
      })
      .catch((nextError) => {
        if (active) setError(String(nextError));
      });
    return () => {
      active = false;
    };
  }, [filePath, sourceSessionId, bust]);

  useEffect(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setWatching(false);
    if (!watchActive) return;

    let active = true;
    const es = trackEventSource("file-watch", new EventSource(`/api/files/${encodeFilePathForApi(filePath)}?type=watch${sourceSessionId ? `&sessionId=${encodeURIComponent(sourceSessionId)}` : ""}`), filePath);
    esRef.current = es;
    es.addEventListener("connected", () => {
      if (active) setWatching(true);
    });
    es.addEventListener("change", (e) => {
      if (!active) return;
      try {
        const d = JSON.parse((e as MessageEvent).data) as { size?: number; mtime?: string };
        const version = fileVersion(d);
        if (!fileVersionChanged(shownVersionRef.current, version)) return;
        shownVersionRef.current = version;
      } catch { /* ignore */ }
      setBust((b) => b + 1);
    });
    const markDisconnected = () => {
      if (active) setWatching(false);
    };
    es.addEventListener("error", markDisconnected);
    es.onerror = markDisconnected;
    return () => {
      active = false;
      es.close();
      if (esRef.current === es) esRef.current = null;
    };
  }, [filePath, sourceSessionId, watchActive]);

  // Watch heartbeats die with a hidden page; a `v` bump on return re-signs.
  const wasHiddenRef = useRef(false);
  useEffect(() => {
    if (!pageHidden && wasHiddenRef.current) setBust((b) => b + 1);
    wasHiddenRef.current = pageHidden;
  }, [pageHidden]);

  const retry = useCallback(() => setBust((b) => b + 1), []);

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", overflow: "hidden" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "4px 16px",
          borderBottom: "1px solid var(--border)",
          fontSize: 11,
          color: "var(--text-dim)",
          background: "var(--bg)",
          flexShrink: 0,
        }}
      >
        <span style={{ fontFamily: "var(--font-mono)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={filePath}>
          {getRelativeFilePath(filePath, cwd)}
        </span>
        <span style={{ marginLeft: "auto" }} />
        <KkViewToggle mode="kk" onChange={(mode) => { if (mode === "builtin") onUseSourceRef.current(); }} />
        <span
          title={watching ? t("i18n.liveSync") : t("i18n.notWatching")}
          style={{ display: "flex", alignItems: "center", gap: 4, color: watching ? "#4ade80" : "var(--text-dim)", flexShrink: 0 }}
        >
          <span
            style={{
              width: 7,
              height: 7,
              borderRadius: "50%",
              background: watching ? "#4ade80" : "var(--border)",
              display: "inline-block",
              boxShadow: watching ? "0 0 4px #4ade80" : "none",
            }}
          />
          {watching ? "live" : "static"}
        </span>
      </div>
      <div style={{ flex: 1, minHeight: 0, background: "var(--bg-panel)" }}>
        {error ? (
          <div style={{ height: "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, padding: 24, color: "#f87171", fontSize: 13, textAlign: "center" }}>
            <span>{error}</span>
            <span style={{ display: "flex", gap: 8 }}>
              <button
                type="button"
                onClick={retry}
                style={{
                  fontSize: 12,
                  padding: "3px 12px",
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                {t("i18n.kkRetry")}
              </button>
              <button
                type="button"
                onClick={() => onUseSourceRef.current()}
                style={{
                  fontSize: 12,
                  padding: "3px 12px",
                  borderRadius: 4,
                  border: "1px solid var(--border)",
                  background: "transparent",
                  color: "var(--text)",
                  cursor: "pointer",
                }}
              >
                {t("i18n.kkOpenSource")}
              </button>
            </span>
          </div>
        ) : previewUrl ? (
          <iframe
            key={previewUrl}
            src={previewUrl}
            title={t("i18n.previewFile", { file: getFileName(filePath) })}
            style={{ width: "100%", height: "100%", border: "none" }}
          />
        ) : (
          <div style={{ height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 13 }}>
            {t("i18n.loading")}
          </div>
        )}
      </div>
    </div>
  );
}
