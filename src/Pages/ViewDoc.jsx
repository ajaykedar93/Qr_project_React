// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:8080";

/** Parse RFC 5987 content-disposition to get a safe filename */
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

export default function ViewDoc() {
  const { documentId } = useParams();
  const [sp] = useSearchParams();
  const shareId = sp.get("share_id");

  const [access, setAccess] = useState(null); // "public" | "private" | null
  const [iframeSrc, setIframeSrc] = useState(null);
  const [downloading, setDownloading] = useState(false);
  const [meta, setMeta] = useState({ filename: null, type: null, size: null });
  const [failedPreview, setFailedPreview] = useState(false);
  const blobUrlRef = useRef(null);

  const verifiedEmail = sessionStorage.getItem("verifiedEmail") || "";

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

  // Cleanup any object URLs we create
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Determine access (public/private) so we can decide about download
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!shareId) {
        // Fallback: if opened without a share (e.g., owner), allow download button
        setAccess("private");
        return;
      }
      try {
        const { data } = await axios.get(`${API_BASE}/shares/${shareId}/minimal`);
        if (!ignore) setAccess(data?.access || null);
      } catch (e) {
        if (!ignore) setAccess(null);
        const msg = e?.response?.data?.error || "Unable to resolve share";
        toast.error(msg);
      }
    })();
    return () => { ignore = true; };
  }, [shareId]);

  // Fetch file as blob (so we can attach headers for private)
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        setFailedPreview(false);

        const headers = {};
        // Only send verified email if private; backend checks this
        if (access === "private" && verifiedEmail) {
          headers["x-user-email"] = verifiedEmail;
        }

        // Optional: include Authorization if you allow owner-auth view without share
        const token = localStorage.getItem("token");
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const resp = await axios.get(viewUrl, {
          responseType: "blob",
          headers,
        });

        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"];
        const size = Number(resp.headers?.["content-length"]) || undefined;
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
        setMeta({ filename, type: blob.type, size });
      } catch (e) {
        setFailedPreview(true);
        const msg =
          e?.response?.data?.error ||
          (typeof e?.response?.data === "string" ? e.response.data : null) ||
          "Unable to open document";
        toast.error(msg);
      }
    })();
    return () => { cancelled = true; };
  }, [viewUrl, access, verifiedEmail, documentId]);

  async function doDownload() {
    try {
      setDownloading(true);
      const headers = {};
      if (access === "private" && verifiedEmail) {
        headers["x-user-email"] = verifiedEmail;
      }
      const token = localStorage.getItem("token");
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await axios.get(downloadUrl, { responseType: "blob", headers });
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
      const msg =
        e?.response?.data?.error ||
        (typeof e?.response?.data === "string" ? e.response.data : null) ||
        "Download not allowed";
      toast.error(msg);
    } finally {
      setDownloading(false);
    }
  }

  const openRaw = () => {
    // For private shares, opening raw directly won’t carry x-user-email
    // so keep the blob preview as the primary, and raw for public/owner only.
    window.open(viewUrl, "_blank", "noopener,noreferrer");
  };

  const fancyMeta = [
    meta.filename ? `File: ${meta.filename}` : null,
    meta.type ? `Type: ${meta.type}` : null,
    meta.size ? `Size: ${formatSize(meta.size)}` : null,
  ]
    .filter(Boolean)
    .join("  •  ");

  const canDownload = access === "private"; // server also enforces this

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
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6, lineHeight: 1.2 }}>Document Viewer</h2>
          {fancyMeta && <div style={{ fontSize: 12, opacity: 0.75 }}>{fancyMeta}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 12 }}>
          <button className="btn" onClick={openRaw}>Open raw in new tab</button>

          <button
            className="btn btn-primary"
            onClick={doDownload}
            disabled={!canDownload || downloading}
            title={!canDownload ? "Public shares are view-only" : ""}
          >
            {downloading ? "Downloading…" : canDownload ? "Download" : "Download (disabled for public)"}
          </button>

          <Link className="btn" to="/dashboard">Back</Link>
        </div>

        {iframeSrc && !failedPreview ? (
          <iframe
            title="Document"
            src={iframeSrc}
            // Safe defaults for viewing; adjust if you need script execution inside previews
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
          <div
            style={{
              opacity: 0.8,
              background: "#0b1230",
              border: "1px dashed #2a3170",
              padding: 18,
              borderRadius: 10,
            }}
          >
            <div style={{ fontWeight: 600, marginBottom: 6 }}>Preview unavailable</div>
            <div style={{ fontSize: 13, opacity: 0.8, marginBottom: 10 }}>
              This file type might not be previewable in the browser. You can still open the raw file or download it.
            </div>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <button className="btn" onClick={openRaw}>Open raw in new tab</button>
              <button
                className="btn btn-primary"
                onClick={doDownload}
                disabled={!canDownload || downloading}
                title={!canDownload ? "Public shares are view-only" : ""}
              >
                {downloading ? "Downloading…" : canDownload ? "Download" : "Download (disabled for public)"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
