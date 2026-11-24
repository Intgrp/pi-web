"use client";

import { useI18n } from "@/hooks/useI18n";

export type PreviewMode = "kk" | "builtin";

interface Props {
  mode: PreviewMode;
  onChange: (mode: PreviewMode) => void;
}

/**
 * The preview-engine switch shown in every viewer toolbar:
 *
 *   [原始]  (oo)  [kkFileView]
 *
 * The knob sits under the active side; clicking either label (or the track)
 * activates that engine. "原始" is pi-web's built-in viewer, "kkFileView" the
 * external previewer. Rendered inside the file-viewer toolbar rows, which are
 * small and dim — so the control stays compact.
 */
export function KkViewToggle({ mode, onChange }: Props) {
  const { t } = useI18n();
  const kkActive = mode === "kk";
  const labelStyle = (isActive: boolean) => ({
    border: "none",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    fontSize: 11,
    color: isActive ? "var(--text)" : "var(--text-dim)",
    fontWeight: isActive ? 600 : 400,
    flexShrink: 0,
  });
  return (
    <span
      role="radiogroup"
      aria-label={t("i18n.kkPreview")}
      style={{ display: "inline-flex", alignItems: "center", gap: 6, flexShrink: 0 }}
    >
      <button type="button" role="radio" aria-checked={!kkActive} style={labelStyle(!kkActive)} onClick={() => onChange("builtin")}>
        {t("i18n.previewBuiltin")}
      </button>
      <button
        type="button"
        role="switch"
        aria-checked={kkActive}
        aria-label={t("i18n.kkPreview")}
        title={t("i18n.kkPreview")}
        onClick={() => onChange(kkActive ? "builtin" : "kk")}
        style={{
          position: "relative",
          display: "inline-block",
          width: 26,
          height: 14,
          borderRadius: 7,
          background: kkActive ? "var(--accent)" : "var(--border)",
          transition: "background 0.15s ease",
          border: "none",
          padding: 0,
          cursor: "pointer",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 2,
            left: kkActive ? 14 : 2,
            width: 10,
            height: 10,
            borderRadius: "50%",
            background: "var(--bg)",
            boxShadow: "0 1px 2px rgba(0, 0, 0, 0.35)",
            transition: "left 0.15s ease",
          }}
        />
      </button>
      <button type="button" role="radio" aria-checked={kkActive} style={labelStyle(kkActive)} onClick={() => onChange("kk")}>
        kkFileView
      </button>
    </span>
  );
}
