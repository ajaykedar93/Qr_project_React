// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend base

// ---------- Helpers ----------
function parseFilename(disposition = "") {
  const star = disposition.match(/filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i)?.[2];
  if (star) return decodeURIComponent(star);
  const plain = disposition.match(/filename\s*=\s*"?([^"]+)"?/i)?.[1];
  return plain || null;
}
function formatSize(bytes) {
  if (bytes == null) return "";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, n = Number(bytes);
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}
function extFromName(name = "") {
  const m = name.toLowerCase().match(/\.([a-z0-9]+)(?:$|\?)/i);
  return m ? m[1] : "";
}
function isOfficeExt(ext) {
  return ["doc", "docx", "xls", "xlsx", "ppt", "pptx"].includes(ext);
}
function isPdfExt(ext) {
  return ext === "pdf";
}
function isImageMime(m) {
  return /^image\//i.test(m || "");
}
function isAudioMime(m) {
  return /^audio\//i.test(m || "");
}
function isVideoMime(m) {
  return /^video\//i.test(m || "");
}
function isTextMime(m) {
  // ✅ FIXED REGEX
  return /^(text\/|application\/(json|xml|yaml))$/i.test(m || "");
}

export default function ViewDoc() {
  const { documentId } = useParams();
  const [sp] = useSearchParams();
  const shareId = sp.get("share_id");
  const token = sp.get("token");

  const [access, setAccess] = useState(null); // "public" | "private" | null
  const [iframeSrc, setIframeSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [meta, setMeta] = useState({ filename: null, type: null, size: null });
  const [failedPreview, setFailedPreview] = useState(false);
  const blobUrlRef = useRef(null);

  const verifiedEmail = sessionStorage.getItem("verifiedEmail") || "";

  // Canonical URLs
  const rawViewUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/view/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    if (token) u.searchParams.set("token", token);
    return u.toString();
  }, [documentId, shareId, token]);

  const rawDownloadUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/download/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    if (token) u.searchParams.set("token", token);
    return u.toString();
  }, [documentId, shareId, token]);

  // Cleanup blob URL
  useEffect(() => () => {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
  }, []);

  // Resolve share type
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!shareId && !token) { if (!ignore) setAccess("private"); return; }
      try {
        const url = shareId
          ? `${API_BASE}/shares/${shareId}/minimal`
          : `${API_BASE}/shares/resolve?token=${encodeURIComponent(token)}&doc=${encodeURIComponent(documentId)}`;
        const { data } = await axios.get(url);
        if (!ignore) setAccess(data?.access || null);
      } catch (e) {
        if (!ignore) setAccess(null);
        toast.error(e?.response?.data?.error || "Unable to resolve share");
      }
    })();
    return () => { ignore = true; };
  }, [shareId, token, documentId]);

  // Block shortcuts (public only)
  useEffect(() => {
    if (access !== "public") return;
    const prevent = (e) => e.preventDefault();
    const stop = (e) => { e.preventDefault(); e.stopPropagation(); };
    const keyBlocker = (e) => {
      const k = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      if (
        k === "f12" ||
        (ctrl && ["s", "p", "u", "c", "i"].includes(k)) ||
        (ctrl && e.shiftKey && ["i", "j"].includes(k))
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

  // Decide preview
  useEffect(() => {
    let cancelled = false;

    async function previewPrivate() {
      try {
        setFailedPreview(false);
        const headers = {};
        if (verifiedEmail) headers["x-user-email"] = verifiedEmail;
        const jwt = localStorage.getItem("token");
        if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

        const resp = await axios.get(rawViewUrl, { responseType: "blob", headers });
        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"];
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
        toast.error(e?.response?.data?.error || "Unable to open document");
      }
    }

    async function previewPublic() {
      try {
        setFailedPreview(false);
        const resp = await axios.get(rawViewUrl, { responseType: "blob" });
        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"];
        const size = Number(resp.headers?.["content-length"]) || undefined;
        const fname = parseFilename(disp) || `document-${documentId}`;
        const ext = extFromName(fname);
        setMeta({ filename: fname, type: type || "", size });

        if (isOfficeExt(ext)) {
          setIframeSrc(`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawViewUrl)}`);
          return;
        }
        if (isPdfExt(ext) || isImageMime(type) || isAudioMime(type) || isVideoMime(type) || isTextMime(type)) {
          const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
          const url = URL.createObjectURL(blob);
          if (cancelled) { URL.revokeObjectURL(url); return; }
          if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = url;
          setIframeSrc(url);
          return;
        }
        // fallback
        const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);
        if (cancelled) { URL.revokeObjectURL(url); return; }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;
        setIframeSrc(url);
      } catch {
        setIframeSrc(null);
        setFailedPreview(true);
      }
    }

    if (access === "private") previewPrivate();
    else if (access === "public") previewPublic();
    else setIframeSrc(null);

    return () => { cancelled = true; };
  }, [access, rawViewUrl, documentId, verifiedEmail]);

  // Download (private only)
  async function doDownload() {
    try {
      setDownloading(true);
      const headers = {};
      if (access === "private" && verifiedEmail) headers["x-user-email"] = verifiedEmail;
      const jwt = localStorage.getItem("token");
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;
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
      toast.error(e?.response?.data?.error || "Download not allowed");
    } finally {
      setDownloading(false);
    }
  }

  const fancyMeta = [meta.filename && `File: ${meta.filename}`, meta.type && `Type: ${meta.type}`, meta.size && `Size: ${formatSize(meta.size)}`]
    .filter(Boolean).join(" • ");
  const canDownload = access === "private";

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
        {access === "public" && (
          <div style={{
            position: "absolute", top: 12, right: -40, transform: "rotate(35deg)",
            background: "#2a3170", color: "#cfe2ff", padding: "6px 60px", fontSize: 12,
            border: "1px solid #3a4399"
          }}>
            VIEW ONLY — DOWNLOAD DISABLED
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h2 style={{ marginTop: 0 }}>Document Viewer</h2>
          {fancyMeta && <div style={{ fontSize: 12, opacity: 0.75 }}>{fancyMeta}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          {canDownload ? (
            <button className="btn btn-primary" onClick={doDownload} disabled={downloading}>
              {downloading ? "Downloading…" : "Download"}
            </button>
          ) : (
            <button className="btn" disabled>Download (disabled for public)</button>
          )}
          <Link className="btn" to="/dashboard">Back</Link>
        </div>

        {iframeSrc && !failedPreview ? (
          <div style={{ position: "relative" }}>
            {access === "public" && <div style={{ position: "absolute", inset: 0, zIndex: 2 }} />}
            <iframe
              title="Document"
              src={iframeSrc}
              sandbox={
                iframeSrc.startsWith("https://view.officeapps.live.com")
                  ? undefined
                  : (access === "public"
                    ? "allow-scripts allow-same-origin"
                    : "allow-same-origin allow-popups allow-downloads")
              }
              style={{ width: "100%", height: "72vh", border: "1px solid #2a3170", borderRadius: 10, background: "#000" }}
            />
          </div>
        ) : (
          <div style={{ opacity: 0.85, background: "#0b1230", border: "1px dashed #2a3170", padding: 18, borderRadius: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview unavailable</div>
            <div style={{ fontSize: 13, opacity: 0.9, marginBottom: 10 }}>
              This file type might not be previewable in the browser.
              {access === "private" ? " You can still download it." : " Download is disabled for public shares."}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
