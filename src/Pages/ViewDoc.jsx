// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com";

const isPdf    = (m="") => /^application\/pdf$/i.test(m);
const isImage  = (m="") => /^image\//i.test(m);
const isAudio  = (m="") => /^audio\//i.test(m);
const isVideo  = (m="") => /^video\//i.test(m);
const isText   = (m="") => /^(text\/|application\/(json|xml|yaml))$/i.test(m);
const isOffice = (m="") => /(msword|officedocument|excel|powerpoint)/i.test(m);

export default function ViewDoc() {
  const { documentId } = useParams();
  const [sp] = useSearchParams();

  // If opened through a share link, these exist
  const shareId  = sp.get("share_id") || "";
  const viewOnly = sp.get("viewOnly") === "1"; // public shares set this

  const [meta, setMeta] = useState(null); // {file_name, mime_type, file_size_bytes}
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");
  const autoOpenedRef = useRef(false);

  // Build backend URLs
  const rawViewUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/view/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    return u.toString();
  }, [documentId, shareId]);

  const rawDownloadUrl = useMemo(() => {
    const u = new URL(`${API_BASE}/documents/download/${documentId}`);
    if (shareId) u.searchParams.set("share_id", shareId);
    return u.toString();
  }, [documentId, shareId]);

  // auth/headers: owner or private need token / x-user-email for private
  function buildHeaders() {
    const h = {};
    const token = localStorage.getItem("token");
    if (token) h.Authorization = `Bearer ${token}`;
    const verifiedEmail = sessionStorage.getItem("verifiedEmail");
    if (verifiedEmail) h["x-user-email"] = verifiedEmail; // used by private share
    return h;
  }

  // Fetch document meta (mime/type, size, etc.)
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/documents/${documentId}`, {
          params: shareId ? { share_id: shareId } : {},
          headers: buildHeaders(),
        });
        if (!ignore) setMeta(data);
      } catch (e) {
        const msg = e?.response?.data?.error || "Unable to load document";
        setErr(msg);
        toast.error(msg);
      } finally {
        if (!ignore) setLoading(false);
      }
    })();
    return () => { ignore = true; };
  }, [documentId, shareId]);

  // Auto-open in a new tab once (best UX for “owner views uploads” & most formats)
  useEffect(() => {
    if (!meta) return;
    if (autoOpenedRef.current) return;
    autoOpenedRef.current = true;
    try {
      // For public/office we want Office viewer to render; for others open raw
      const office = isOffice(meta.mime_type) && viewOnly;
      const url = office
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawViewUrl)}`
        : rawViewUrl;
      window.open(url, "_blank", "noopener,noreferrer");
    } catch {
      /* ignore */
    }
  }, [meta, rawViewUrl, viewOnly]);

  async function handleDownload() {
    try {
      const resp = await axios.get(rawDownloadUrl, {
        responseType: "blob",
        headers: buildHeaders(),
      });
      const disp = resp.headers?.["content-disposition"] || "";
      const nameStar = disp.match(/filename\*\s*=\s*[^']*'[^']*'([^;]+)/i)?.[1];
      const name = nameStar ? decodeURIComponent(nameStar)
        : (disp.match(/filename\s*=\s*"?([^"]+)"?/i)?.[1] || meta?.file_name || "file");
      const blob = new Blob([resp.data], { type: resp.headers?.["content-type"] || "application/octet-stream" });
      const a = document.createElement("a");
      const url = URL.createObjectURL(blob);
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Download not allowed");
    }
  }

  if (loading) return <div style={{ padding: 24 }}>Loading…</div>;
  if (err)     return <div style={{ padding: 24, color: "#ff9b9b" }}>{err}</div>;
  if (!meta)   return null;

  // Decide iframe source:
  // - Public Office files must use Office Online (it cannot send custom headers).
  // - Everything else can use the raw view URL (server streams with Range & inline disposition).
  const iframeSrc = isOffice(meta.mime_type) && viewOnly
    ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawViewUrl)}`
    : rawViewUrl;

  // Sandbox: for public we do NOT allow downloads/popups; for Office viewer, leave sandbox undefined.
  const sandbox =
    iframeSrc.startsWith("https://view.officeapps.live.com")
      ? undefined
      : (viewOnly ? "allow-scripts allow-same-origin" : "allow-same-origin allow-popups allow-downloads");

  return (
    <div style={{ maxWidth: 1100, margin: "24px auto", padding: "0 16px", color: "#e9ecff" }}>
      <div
        style={{
          background: "#0f1533",
          padding: 16,
          borderRadius: 14,
          border: "1px solid #2a3170",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* View-only ribbon */}
        {viewOnly && (
          <div style={{
            position: "absolute", top: 12, right: -40, transform: "rotate(35deg)",
            background: "#2a3170", color: "#cfe2ff", padding: "6px 60px", fontSize: 12,
            border: "1px solid #3a4399", letterSpacing: 1
          }}>
            VIEW ONLY — DOWNLOAD DISABLED
          </div>
        )}

        <div style={{ display: "flex", alignItems: "baseline", gap: 12, marginBottom: 10 }}>
          <h2 style={{ margin: 0 }}>Document Viewer</h2>
          <div style={{ fontSize: 12, opacity: 0.75 }}>
            File: {meta.file_name} • Type: {meta.mime_type} • Size: {Number(meta.file_size_bytes||0).toLocaleString()} B
          </div>
        </div>

        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <a className="btn" href={iframeSrc} target="_blank" rel="noreferrer">Open in new tab</a>
          {viewOnly ? (
            <button className="btn" disabled title="Public shares are view-only">Download (disabled for public)</button>
          ) : (
            <button className="btn btn-primary" onClick={handleDownload}>Download</button>
          )}
          <Link className="btn" to="/dashboard">Back</Link>
        </div>

        {/* Inline preview */}
        <div style={{ position: "relative" }}>
          {/* For public, a transparent overlay to reduce right-click/drag hints */}
          {viewOnly && !iframeSrc.startsWith("https://view.officeapps.live.com") && (
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
            sandbox={sandbox}
            style={{
              width: "100%",
              height: "72vh",
              border: "1px solid #2a3170",
              borderRadius: 10,
              background: "#000",
            }}
          />
        </div>

        {/* Small tip for office */}
        {isOffice(meta.mime_type) && !viewOnly && (
          <div style={{ marginTop: 10, fontSize: 12.5, opacity: 0.8 }}>
            Tip: For private Office files, inline preview uses the raw stream. If your browser can't preview it,
            use “Open in new tab” or download.
          </div>
        )}
      </div>
    </div>
  );
}
