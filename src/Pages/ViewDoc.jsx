// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com"; // backend base

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
  while (n >= 1024 && i < u.length - 1) {
    n /= 1024;
    i++;
  }
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
  return /^(text\/|application\/json$)/i.test(m || "");
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

  // Canonical URLs to backend
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

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, []);

  // Resolve share type
  useEffect(() => {
    let ignore = false;
    (async () => {
      if (!shareId && !token) {
        if (!ignore) setAccess("private"); // Owner direct open
        return;
      }
      try {
        const url = shareId
          ? `${API_BASE}/shares/${shareId}/minimal`
          : `${API_BASE}/shares/resolve?token=${encodeURIComponent(
              token
            )}&doc=${encodeURIComponent(documentId)}`;

        const { data } = await axios.get(url);
        if (!ignore) setAccess(data?.access || null);
      } catch (e) {
        if (!ignore) setAccess(null);
        toast.error(e?.response?.data?.error || "Unable to resolve share");
      }
    })();
    return () => {
      ignore = true;
    };
  }, [shareId, token, documentId]);

  // Decide preview strategy
  useEffect(() => {
    let cancelled = false;

    async function previewViaBlob() {
      try {
        setFailedPreview(false);
        const headers = {};
        if (access === "private" && verifiedEmail)
          headers["x-user-email"] = verifiedEmail;
        const jwt = localStorage.getItem("token");
        if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

        const resp = await axios.get(rawViewUrl, { responseType: "blob", headers });

        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"];
        const size = Number(resp.headers?.["content-length"]) || undefined;
        const fname = parseFilename(disp) || `document-${documentId}`;

        const blob = new Blob([resp.data], { type: type || "application/octet-stream" });
        const url = URL.createObjectURL(blob);

        if (cancelled) {
          URL.revokeObjectURL(url);
          return;
        }
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

    async function previewPublicSmart() {
      try {
        setFailedPreview(false);
        const resp = await axios.get(rawViewUrl, { responseType: "blob" });
        const disp = resp.headers?.["content-disposition"];
        const type = resp.headers?.["content-type"];
        const size = Number(resp.headers?.["content-length"]) || undefined;
        const fname = parseFilename(disp) || `document-${documentId}`;
        const ext = extFromName(fname);

        setMeta({ filename: fname, type: type || "", size });

        if (
          isPdfExt(ext) ||
          isImageMime(type) ||
          isAudioMime(type) ||
          isVideoMime(type) ||
          isTextMime(type)
        ) {
          setIframeSrc(rawViewUrl);
          return;
        }

        if (isOfficeExt(ext)) {
          const officeEmbed = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(
            rawViewUrl
          )}`;
          setIframeSrc(officeEmbed);
          return;
        }

        setIframeSrc(null);
        setFailedPreview(true);
      } catch {
        setIframeSrc(null);
        setFailedPreview(true);
      }
    }

    if (access === "private") previewViaBlob();
    else if (access === "public") previewPublicSmart();
    else setIframeSrc(null);

    return () => {
      cancelled = true;
    };
  }, [access, rawViewUrl, documentId, verifiedEmail]);

  async function doDownload() {
    try {
      setDownloading(true);
      const headers = {};
      if (access === "private" && verifiedEmail)
        headers["x-user-email"] = verifiedEmail;
      const jwt = localStorage.getItem("token");
      if (jwt) headers["Authorization"] = `Bearer ${jwt}`;

      const resp = await axios.get(rawDownloadUrl, { responseType: "blob", headers });
      const disp = resp.headers?.["content-disposition"];
      const type = resp.headers?.["content-type"];
      const fname =
        parseFilename(disp) || meta.filename || `document-${documentId}`;

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

  const openRaw = () => window.open(rawViewUrl, "_blank", "noopener,noreferrer");

  const fancyMeta = [meta.filename && `File: ${meta.filename}`, meta.type && `Type: ${meta.type}`, meta.size && `Size: ${formatSize(meta.size)}`].filter(Boolean).join(" • ");

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
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 8 }}>
          <h2 style={{ marginTop: 0, marginBottom: 6 }}>Document Viewer</h2>
          {fancyMeta && <div style={{ fontSize: 12, opacity: 0.75 }}>{fancyMeta}</div>}
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12 }}>
          <button className="btn" onClick={openRaw}>Open raw in new tab</button>
          <button className="btn btn-primary" onClick={doDownload} disabled={!canDownload || downloading}>
            {downloading ? "Downloading…" : canDownload ? "Download" : "Download (disabled for public)"}
          </button>
          <Link className="btn" to="/dashboard">Back</Link>
        </div>

        {iframeSrc && !failedPreview ? (
          <iframe
            title="Document"
            src={iframeSrc}
            sandbox={
              iframeSrc.startsWith("https://view.officeapps.live.com")
                ? undefined
                : "allow-same-origin allow-popups allow-downloads"
            }
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
              This file type might not be previewable in the browser. You can still open the raw file (public) or download it (private).
              {access === "public" && (
                <span style={{ display: "block", marginTop: 6 }}>
                  Tip: Office viewer won’t work on <code>localhost</code>. Deploy to a public URL to enable inline Office previews.
                </span>
              )}
            </div>
            <div style={{ display: "flex", gap: 10 }}>
              <button className="btn" onClick={openRaw}>Open raw in new tab</button>
              <button className="btn btn-primary" onClick={doDownload} disabled={!canDownload || downloading}>
                {downloading ? "Downloading…" : canDownload ? "Download" : "Download (disabled for public)"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
