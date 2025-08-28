// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com";

function parseFilename(disposition = "") {
  // content-disposition: attachment; filename="name.pdf"; filename*=UTF-8''name.pdf
  const fnameStar = disposition.match(/filename\*\s*=\s*([^']*)'[^']*'([^;]+)/i)?.[2];
  if (fnameStar) return decodeURIComponent(fnameStar);
  const fname = disposition.match(/filename\s*=\s*"?([^"]+)"?/i)?.[1];
  return fname || null;
}

function formatSize(bytes) {
  if (!bytes && bytes !== 0) return "";
  const u = ["B", "KB", "MB", "GB", "TB"];
  let i = 0, n = Number(bytes);
  while (n >= 1024 && i < u.length - 1) { n /= 1024; i++; }
  return `${n.toFixed(1)} ${u[i]}`;
}

export default function ViewDoc() {
  const { documentId } = useParams();
  const [sp] = useSearchParams();
  const shareId = sp.get("share_id");
  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const [iframeSrc, setIframeSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [meta, setMeta] = useState({ filename: null, type: null, size: null });
  const [failedPreview, setFailedPreview] = useState(false);
  const blobUrlRef = useRef(null);

  const viewUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/view/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    return u.toString();
  }, [documentId, shareId]);

  const downloadUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/download/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    return u.toString();
  }, [documentId, shareId]);

  // ⚠️ Proper cleanup for object URLs
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Fetch as blob (so private shares work with header)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFailedPreview(false);
        const resp = await axios.get(viewUrl, {
          responseType: "blob",
          headers: { "x-user-id": user?.user_id || "" },
          // you can add Authorization here if your backend expects it:
          // headers: { Authorization: `Bearer ${localStorage.getItem("token")}`, "x-user-id": user?.user_id || "" },
        });

        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"];
        const size = resp.headers?.["content-length"];
        const filename = parseFilename(disp) || `document-${documentId}`;

        const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
        if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = url;

        setIframeSrc(url);
        setMeta({ filename, type: blob.type, size: Number(size) || undefined });
      } catch (e) {
        setFailedPreview(true);
        toast.error(e?.response?.data || "Unable to open document");
      }
    })();
    return () => { cancelled = true; };
  }, [viewUrl, user?.user_id, documentId]);

  async function doDownload() {
    try {
      setDownloading(true);
      const resp = await axios.get(downloadUrl, {
        responseType: "blob",
        headers: { "x-user-id": user?.user_id || "" },
      });
      const disp = resp.headers?.["content-disposition"];
      const type = resp.headers?.["content-type"];
      const filename = parseFilename(disp) || meta.filename || `document-${documentId}`;

      const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data || "Download not allowed");
    } finally {
      setDownloading(false);
    }
  }

  const openRaw = () => window.open(viewUrl, "_blank", "noopener,noreferrer");

  const fancyMeta = [
    meta.filename ? `File: ${meta.filename}` : null,
    meta.type ? `Type: ${meta.type}` : null,
    meta.size ? `Size: ${formatSize(meta.size)}` : null,
  ].filter(Boolean).join("  •  ");

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px" }}>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{ background: "#0f1533", padding: 16, borderRadius: 14, border: "1px solid #2a3170" }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6, lineHeight: 1.2 }}>Document Viewer</h2>
          {fancyMeta && <div style={{ fontSize: 12, opacity: 0.75 }}>{fancyMeta}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <button className="btn" onClick={openRaw}>Open raw in new tab</button>
          <button className="btn btn-primary" onClick={doDownload} disabled={downloading}>
            {downloading ? "Downloading…" : "Download"}
          </button>
          <Link className="btn" to="/dashboard">Back</Link>
        </div>

        {iframeSrc && !failedPreview ? (
          <iframe
            title="Document"
            src={iframeSrc}
            // sandbox can be adjusted if you need scripting; this is safe default for viewing
            sandbox="allow-same-origin allow-popups allow-downloads"
            style={{
              width: "100%",
              height: "72vh",
              border: "1px solid #2a3170",
              borderRadius: 10,
              background: "#000",
            }}
          />
        ) : (
          <div style={{ opacity: 0.8, background: "#0b1230", border: "1px dashed #2a3170", padding: 18, borderRadius: 10 }}>
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview unavailable</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
              This file type might not be previewable in the browser. You can still open the raw file or download it.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={openRaw}>Open raw in new tab</button>
              <button className="btn btn-primary" onClick={doDownload} disabled={downloading}>
                {downloading ? "Downloading…" : "Download"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
