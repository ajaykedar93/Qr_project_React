// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend base

// ---------- Small helpers (no regex flags mistakes) ----------
function parseFilename(disposition = "") {
  try {
    // filename*=utf-8''my%20file.pdf
    const mStar = disposition.match(/filename\*\s*=\s*[^']*'[^']*'([^;]+)/i);
    if (mStar && mStar[1]) return decodeURIComponent(mStar[1]);
    // filename="my file.pdf"
    const mPlain = disposition.match(/filename\s*=\s*"?([^"]+)"?/i);
    if (mPlain && mPlain[1]) return mPlain[1];
  } catch {}
  return null;
}
function formatSize(n) {
  if (n == null) return "";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, v = Number(n);
  while (v >= 1024 && i < u.length - 1) { v /= 1024; i++; }
  return `${v.toFixed(1)} ${u[i]}`;
}
function extFromName(name = "") {
  const i = name.lastIndexOf(".");
  if (i === -1) return "";
  return name.slice(i + 1).toLowerCase();
}
function isOfficeExt(ext) {
  return ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
}
function isPdfType(t = "") {
  return (t || "").toLowerCase().startsWith("application/pdf");
}
function isImageType(t = "") {
  return (t || "").toLowerCase().startsWith("image/");
}
function isAudioType(t = "") {
  return (t || "").toLowerCase().startsWith("audio/");
}
function isVideoType(t = "") {
  return (t || "").toLowerCase().startsWith("video/");
}
function isTextLikeType(t = "") {
  const mt = (t || "").toLowerCase();
  return (
    mt.startsWith("text/") ||
    mt === "application/json" ||
    mt === "application/xml" ||
    mt === "application/yaml"
  );
}

export default function ViewDoc() {
  const { documentId } = useParams();
  const [sp] = useSearchParams();
  const shareId = sp.get("share_id") || "";
  const token = sp.get("token") || "";          // optional token support
  const viewOnlyFlag = sp.get("viewOnly") || ""; // when we force view-only in public

  const [access, setAccess] = useState(null); // "public" | "private" | null
  const [iframeSrc, setIframeSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [meta, setMeta] = useState({ filename: null, type: null, size: null });
  const [failedPreview, setFailedPreview] = useState(false);
  const [officeEmbedUrl, setOfficeEmbedUrl] = useState("");
  const blobUrlRef = useRef(null);

  const verifiedEmail = sessionStorage.getItem("verifiedEmail") || "";

  // Canonical backend URLs
  const rawViewUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/view/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    if (token) u.searchParams.set("token", token);
    if (viewOnlyFlag) u.searchParams.set("viewOnly", viewOnlyFlag);
    return u.toString();
  }, [documentId, shareId, token, viewOnlyFlag]);

  const rawDownloadUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/download/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    if (token) u.searchParams.set("token", token);
    return u.toString();
  }, [documentId, shareId, token]);

  useEffect(() => () => {
    if (blobUrlRef.current) { URL.revokeObjectURL(blobUrlRef.current); blobUrlRef.current = null; }
  }, []);

  // Resolve share type first
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        if (!shareId && !token) {
          // If you hit the viewer directly without share params, treat as private (owner flow).
          setAccess("private");
          return;
        }
        const url = shareId
          ? `${API_BASE}/shares/${shareId}/minimal`
          : `${API_BASE}/shares/resolve?token=${encodeURIComponent(token)}&doc=${encodeURIComponent(documentId)}`;
        const { data } = await axios.get(url);
        if (ignore) return;
        setAccess(data?.access || null);
      } catch (e) {
        if (!ignore) setAccess(null);
        toast.error(e?.response?.data?.error || "Unable to resolve share");
      }
    })();
    return () => { ignore = true; };
  }, [shareId, token, documentId]);

  // Public: block common save/inspect shortcuts in this single-page viewer
  useEffect(() => {
    if (access !== "public") return;
    const prevent = (e) => e.preventDefault();
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    const keyBlocker = (e) => {
      const k = (e.key || "").toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        k === "f12" ||
        (ctrl && (k === "s" || k === "p" || k === "u" || k === "c" || k === "i")) ||
        (e.shiftKey && ctrl && (k === "i" || k === "j"))
      ) stop(e);
    };
    document.addEventListener("contextmenu", prevent);
    document.addEventListener("keydown", keyBlocker);
    document.addEventListener("dragstart", prevent);
    return () => {
      document.removeEventListener("contextmenu", prevent);
      document.removeEventListener("keydown", keyBlocker);
      document.removeEventListener("dragstart", prevent);
    };
  }, [access]);

  // Decide preview strategy (blob or Office embed). Also provide “Open in new tab”.
  useEffect(() => {
    let cancelled = false;

    async function previewPrivateViaBlob() {
      try {
        setFailedPreview(false);
        setOfficeEmbedUrl("");
        const headers = {};
        const jwt = localStorage.getItem("token");
        if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
        if (verifiedEmail) headers["x-user-email"] = verifiedEmail;

        const resp = await axios.get(rawViewUrl, { responseType: "blob", headers });

        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"] || "";
        const size = Number(resp.headers?.["content-length"]) || undefined;
        const fname = parseFilename(disp) || `document-${documentId}`;

        const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        if (cancelled) { URL.revokeObjectURL(url); return; }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;

        setIframeSrc(url);
        setMeta({ filename: fname, type: blob.type, size });
      } catch (e) {
        setFailedPreview(true);
        toast.error(
          e?.response?.data?.error ||
          (typeof e?.response?.data === "string" ? e.response.data : null) ||
          "Unable to open document"
        );
      }
    }

    async function previewPublic() {
      try {
        setFailedPreview(false);
        setOfficeEmbedUrl("");

        // Public: try fetching as blob so we hide the origin URL in this page.
        const resp = await axios.get(rawViewUrl, { responseType: "blob" });
        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"] || "";
        const size = Number(resp.headers?.["content-length"]) || undefined;
        const fname = parseFilename(disp) || `document-${documentId}`;
        const ext = extFromName(fname);

        setMeta({ filename: fname, type, size });

        // Office types → try Office embed (works only if URL is publicly accessible to Microsoft).
        if (isOfficeExt(ext)) {
          // Try Office first (best UX). If your file URL requires auth, this will not work.
          const office = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawViewUrl)}`;
          setOfficeEmbedUrl(office);
          setIframeSrc(office);
          return;
        }

        // pdf/images/audio/video/text → render blob url inline
        if (
          isPdfType(type) ||
          isImageType(type) ||
          isAudioType(type) ||
          isVideoType(type) ||
          isTextLikeType(type)
        ) {
          const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          if (cancelled) { URL.revokeObjectURL(url); return; }
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = url;
          setIframeSrc(url);
          return;
        }

        // Fallback: render blob anyway; if it can't preview, user can open in new tab.
        const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        if (cancelled) { URL.revokeObjectURL(url); return; }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        setIframeSrc(url);
      } catch {
        // If even blob fetch fails (CORS/headers), fallback UI will show "Open in new tab"
        setIframeSrc(null);
        setFailedPreview(true);
      }
    }

    if (access === "private") previewPrivateViaBlob();
    else if (access === "public") previewPublic();
    else setIframeSrc(null);

    return () => { cancelled = true; };
  }, [access, rawViewUrl, documentId, verifiedEmail]);

  async function doDownload() {
    try {
      setDownloading(true);
      const headers = {};
      const jwt = localStorage.getItem("token");
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
      if (access === "private" && verifiedEmail) headers["x-user-email"] = verifiedEmail;

      const resp = await axios.get(rawDownloadUrl, { responseType: "blob", headers });
      const disp = resp.headers?.["content-disposition"];
      const type = resp.headers?.["content-type"];
      const fname = parseFilename(disp) || meta.filename || `document-${documentId}`;

      const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = fname;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        "Download not allowed"
      );
    } finally {
      setDownloading(false);
    }
  }

  const fancyMeta = [meta.filename && `File: ${meta.filename}`, meta.type && `Type: ${meta.type}`, meta.size && `Size: ${formatSize(meta.size)}`]
    .filter(Boolean).join(" • ");

  const publicViewOnly = access === "public";

  // Open in new tab (browser/system viewer).
  // NOTE: For PRIVATE documents, new tab request cannot include headers, so it will likely 401.
  // We show this button only for PUBLIC shares.
  function openInNewTab() {
    window.open(rawViewUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          background: "#0f1533",
          padding: 16,
          borderRadius: 14,
          border: "1px solid #2a3170",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* View-only ribbon for public */}
        {publicViewOnly && (
          <div style={{
            position: "absolute", top: 12, right: -40, transform: "rotate(35deg)",
            background: "#2a3170", color: "#cfe2ff", padding: "6px 60px", fontSize: 12, letterSpacing: 1,
            border: "1px solid #3a4399"
          }}>
            VIEW ONLY — DOWNLOAD DISABLED
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>Document Viewer</h2>
          {fancyMeta && <div style={{ fontSize: 12, opacity: 0.75 }}>{fancyMeta}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {publicViewOnly ? (
            <>
              <button className="btn" onClick={openInNewTab} title="Open in a new browser tab">
                Open in new tab
              </button>
              <button className="btn" disabled title="Public shares are view-only. Download is disabled.">
                Download (disabled for public)
              </button>
            </>
          ) : (
            <>
              <button className="btn btn-primary" onClick={doDownload} disabled={downloading}>
                {downloading ? "Downloading…" : "Download"}
              </button>
              {/* We intentionally hide open-in-new-tab for private, because it can’t carry auth headers */}
            </>
          )}
          <Link className="btn" to="/dashboard">Back</Link>
        </div>

        {iframeSrc && !failedPreview ? (
          <div style={{ position: "relative" }}>
            {/* Transparent overlay (public) to reduce right-click/drag hints */}
            {publicViewOnly && (
              <div
                style={{ position: "absolute", inset: 0, zIndex: 2 }}
                onContextMenu={(e) => e.preventDefault()}
                onMouseDown={(e) => e.button === 2 && e.preventDefault()}
                onDragStart={(e) => e.preventDefault()}
              />
            )}
            <iframe
              title="Document"
              src={iframeSrc}
              // For Office embed we do not set sandbox; for normal blob preview we restrict downloads when public
              sandbox={
                officeEmbedUrl
                  ? undefined
                  : (publicViewOnly
                      ? "allow-scripts allow-same-origin"
                      : "allow-same-origin allow-popups allow-downloads")
              }
              style={{
                width: "100%",
                height: "72vh",
                border: "1px solid #2a3170",
                borderRadius: 10,
                background: "#000",
              }}
            />
          </div>
        ) : (
          <div style={{ opacity: 0.9, background: "#0b1230", border: "1px dashed #2a3170", padding: 18, borderRadius: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview unavailable</div>
            <div style={{ fontSize: 13, opacity: 0.95, marginBottom: 10 }}>
              This file might not be previewable here.
              {publicViewOnly ? (
                <> You can try <b>Open in new tab</b> (system viewer) above.</>
              ) : (
                <> You can still <b>download</b> it.</>
              )}
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {publicViewOnly ? (
                <button className="btn" onClick={openInNewTab}>Open in new tab</button>
              ) : (
                <button className="btn btn-primary" onClick={doDownload} disabled={downloading}>
                  {downloading ? "Downloading…" : "Download"}
                </button>
              )}
            </div>
            {officeEmbedUrl && (
              <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.85 }}>
                Tip: Office Online Viewer requires a public, directly-accessible file URL. If your file needs
                authentication, the embed will fail. Try <b>Open in new tab</b> or download instead.
              </div>
            )}
          </div>
        )}

        {/* Gentle note */}
        {publicViewOnly && (
          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.8 }}>
            Note: View-only mode removes download UI and blocks common save/print shortcuts. Client-side measures
            can’t guarantee perfect prevention, but this provides a strong deterrent.
          </div>
        )}
      </motion.div>
    </div>
  );
}
