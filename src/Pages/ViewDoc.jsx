// src/Pages/ViewDoc.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useSearchParams, Link, useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-toastify";

const API_BASE = "https://qr-project-v0h4.onrender.com";

/* -----------------------------
   Helpers
------------------------------*/
const OFFICE_RE = /(msword|officedocument|excel|powerpoint)/i;
const isOffice = (mime = "", file = "") => {
  const ext = (file.split(".").pop() || "").toLowerCase();
  return OFFICE_RE.test(mime) || ["doc", "docx", "ppt", "pptx", "xls", "xlsx"].includes(ext);
};

function parseFilenameFromDisposition(disp, fallback) {
  if (!disp) return fallback || "file";
  const star = disp.match(/filename\*\s*=\s*[^']*'[^']*'([^;]+)/i)?.[1];
  if (star) return decodeURIComponent(star);
  return disp.match(/filename\s*=\s*"?([^"]+)"?/i)?.[1] || fallback || "file";
}

/* -----------------------------
   Component
------------------------------*/
export default function ViewDoc() {
  const nav = useNavigate();
  const { documentId } = useParams();
  const [sp] = useSearchParams();

  // From /view/:id?share_id=...&token=...&viewOnly=1
  const shareId = sp.get("share_id") || "";
  const token   = sp.get("token") || "";
  const viewOnly = sp.get("viewOnly") === "1";

  const [meta, setMeta] = useState(null); // { file_name, mime_type, file_size_bytes, preview_strategy }
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // for non-public flows we fetch BLOB (so headers flow for auth and x-user-email)
  const [blobUrl, setBlobUrl] = useState("");
  const [textContent, setTextContent] = useState(""); // when previewing text files
  const blobUrlRef = useRef("");

  // Build backend URLs that always forward share params
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

  // Headers (owner or verified private)
  function buildHeaders() {
    const h = {};
    const t = localStorage.getItem("token");
    if (t) h.Authorization = `Bearer ${t}`;
    const verified = sessionStorage.getItem("verifiedEmail");
    if (verified) h["x-user-email"] = verified;
    return h;
  }

  /* 1) Load meta */
  useEffect(() => {
    let ignore = false;
    (async () => {
      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/documents/${documentId}`, {
          params: { ...(shareId ? { share_id: shareId } : {}), ...(token ? { token } : {}) },
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentId, shareId, token]);

  /* 2) Fetch BLOB for private/owner to enable inline views with headers.
        For public, we'll stream directly from rawViewUrl in the viewer. */
  useEffect(() => {
    if (!meta) return;

    // Cleanup old blob URL
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = "";
    }
    setBlobUrl("");
    setTextContent("");

    const ownerAuthed = !!localStorage.getItem("token");
    const isPrivateFlow = !!shareId && !viewOnly;
    const needBlob = isPrivateFlow || ownerAuthed;

    if (!needBlob) return; // public flows use direct URLs

    (async () => {
      try {
        const resp = await axios.get(rawViewUrl, { responseType: "blob", headers: buildHeaders() });
        // Text preview: try reading text if strategy is 'text'
        if (meta.preview_strategy === "text") {
          const txt = await resp.data.text();
          setTextContent(txt);
        }
        const url = URL.createObjectURL(
          new Blob([resp.data], { type: resp.headers?.["content-type"] || meta.mime_type || "application/octet-stream" })
        );
        blobUrlRef.current = url;
        setBlobUrl(url);
      } catch (e) {
        const msg = e?.response?.data?.error || "Preview not allowed";
        toast.error(msg);
      }
    })();
  }, [meta, rawViewUrl, shareId, viewOnly]);

  /* 3) Download */
  async function handleDownload() {
    try {
      const resp = await axios.get(rawDownloadUrl, {
        responseType: "blob",
        headers: buildHeaders(),
      });
      const name = parseFilenameFromDisposition(
        resp.headers?.["content-disposition"],
        meta?.file_name || "file"
      );
      const url = URL.createObjectURL(resp.data);
      const a = document.createElement("a");
      a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Download not allowed");
    }
  }

  // Disposition: open in new tab click
  function openInNewTab() {
    if (!meta) return;
    const ownerAuthed = !!localStorage.getItem("token");
    const isPrivateFlow = !!shareId && !viewOnly;
    const isPublicFlow  = !!shareId && viewOnly;

    if (isPrivateFlow || ownerAuthed) {
      const url = blobUrl || rawViewUrl;
      window.open(url, "_blank", "noopener,noreferrer");
    } else if (isPublicFlow) {
      if (isOffice(meta.mime_type, meta.file_name) || meta.preview_strategy === "office") {
        const office = `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawViewUrl)}`;
        window.open(office, "_blank", "noopener,noreferrer");
      } else {
        window.open(rawViewUrl, "_blank", "noopener,noreferrer");
      }
    }
  }

  /* -----------------------------
     Rendering
  ------------------------------*/
  if (loading) return <Shell><Card><div>Loading…</div></Card></Shell>;
  if (err)     return <Shell><Card><div style={{color:"#ff6b6b"}}>{err}</div></Card></Shell>;
  if (!meta)   return null;

  const needsReverify = (!!shareId && !viewOnly && !sessionStorage.getItem("verifiedEmail"));

  // Choose viewer element by strategy and access mode
  function renderViewer() {
    const strategy = meta.preview_strategy || guessStrategy(meta.mime_type, meta.file_name);
    const ownerAuthed = !!localStorage.getItem("token");
    const isPrivateFlow = !!shareId && !viewOnly;
    const isPublicFlow  = !!shareId && viewOnly;
    const useBlob = (isPrivateFlow || ownerAuthed);

    // URLs per mode
    const src = useBlob ? (blobUrl || "") :
      (strategy === "office" || isOffice(meta.mime_type, meta.file_name)
        ? `https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(rawViewUrl)}`
        : rawViewUrl);

    switch (strategy) {
      case "pdf":
        return src ? (
          <iframe
            title="PDF"
            src={src}
            sandbox={isPublicFlow ? "allow-scripts allow-same-origin" : "allow-same-origin allow-popups allow-downloads"}
            style={frameStyle()}
          />
        ) : fallbackInfo();
      case "image":
        return src ? (
          <img alt={meta.file_name} src={src} style={{ width: "100%", maxHeight: "78vh", objectFit: "contain", borderRadius: 12, border: "1px solid var(--line)" }} />
        ) : fallbackInfo();
      case "audio":
        return src ? (
          <audio controls style={avStyle()} src={src} />
        ) : fallbackInfo();
      case "video":
        return src ? (
          <video controls style={avStyle()} src={src} />
        ) : fallbackInfo();
      case "text":
        if (useBlob) {
          return (
            <pre style={preStyle()}>
              {textContent || "—"}
            </pre>
          );
        }
        return (
          <iframe
            title="Text"
            src={src}
            sandbox="allow-same-origin"
            style={frameStyle()}
          />
        );
      case "office":
        if (!useBlob) {
          return <iframe title="Office" src={src} style={frameStyle()} />;
        }
        return blobUrl ? (
          <iframe title="Office Blob" src={blobUrl} style={frameStyle()} />
        ) : fallbackInfo("Preview might be limited for protected Office files. Use Download.");
      default:
        return (
          <div style={{ display: "grid", gap: 10 }}>
            {src && (
              <iframe
                title="File"
                src={src}
                sandbox={isPublicFlow ? "allow-same-origin" : "allow-same-origin allow-popups allow-downloads"}
                style={frameStyle()}
              />
            )}
            <div className="muted" style={{ fontSize: 13 }}>
              This format may not support inline preview. Try <b>Open in new tab</b> or <b>Download</b> (if allowed).
            </div>
          </div>
        );
    }
  }

  return (
    <Shell>
      <Card>
        {viewOnly && <Ribbon text="VIEW ONLY — DOWNLOAD DISABLED" />}

        <h2 style={{ marginBottom: 6, color: "#0a8f6a" }}>Document Viewer</h2>
        <div style={{ fontSize: 12, opacity: 0.85, marginBottom: 10 }}>
          File: <b>{meta.file_name}</b> • Type: {meta.mime_type} • Size: {Number(meta.file_size_bytes||0).toLocaleString()} B
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
          <button className="btn btn-primary" onClick={openInNewTab}>Open in new tab</button>
          {viewOnly ? (
            <button className="btn btn-disabled" disabled title="Public shares are view-only">Download (disabled)</button>
          ) : (
            <button className="btn btn-primary" onClick={handleDownload}>Download</button>
          )}
          <Link className="btn btn-ghost" to="/dashboard">Back</Link>
          {!!needsReverify && (
            <button className="btn btn-ghost" onClick={() => nav(`/share/${shareId}`, { replace: true })}>
              Verify again
            </button>
          )}
        </div>

        {/* Viewer */}
        {renderViewer()}
      </Card>
      <Styles />
    </Shell>
  );
}

/* -----------------------------
   Strategy fallback/guess
------------------------------*/
function guessStrategy(mime = "", file = "") {
  const ext = (file.split(".").pop() || "").toLowerCase();
  if (mime === "application/pdf" || ext === "pdf") return "pdf";
  if (/^image\//i.test(mime)) return "image";
  if (/^audio\//i.test(mime)) return "audio";
  if (/^video\//i.test(mime)) return "video";
  if (/^text\//i.test(mime) || ["txt","md","json","xml","yaml","yml","csv","log"].includes(ext)) return "text";
  if (/(json|xml|yaml)/i.test(mime)) return "text";
  if (/(msword|officedocument|excel|powerpoint)/i.test(mime) || ["doc","docx","ppt","pptx","xls","xlsx"].includes(ext)) return "office";
  return "other";
}

/* -----------------------------
   Tiny UI atoms / styles
------------------------------*/
function Shell({ children }) {
  return <div className="container">{children}</div>;
}
function Card({ children }) {
  return <div className="card">{children}</div>;
}
function Ribbon({ text }) {
  return (
    <div style={{
      position: "absolute", top: 12, right: -44, transform: "rotate(35deg)",
      background: "#F2FBFF", color: "#3B74B6",
      padding: "6px 64px", fontSize: 12, border: "1px solid var(--line)"
    }}>{text}</div>
  );
}

const frameStyle = () => ({ width: "100%", height: "74vh", border: "1px solid var(--line)", borderRadius: 12 });
const avStyle = () => ({ width: "100%", maxWidth: 900, margin: "0 auto", display: "block" });
const preStyle = () => ({
  whiteSpace: "pre-wrap",
  wordBreak: "break-word",
  background: "#F9FCFF",          // bright
  color: "#142251",               // readable ink
  border: "1px solid var(--line)",
  borderRadius: 12,
  padding: 14,
  height: "74vh",
  overflow: "auto",
});

function fallbackInfo(msg = "Preview not available.") {
  return <div style={{ padding: 16, textAlign: "center" }}>{msg}</div>;
}

function Styles() {
  return (
    <style>{`
      :root { --line: #e2ecff; --muted: #6d7aa8; }
      html, body, #root {
        background: linear-gradient(180deg, #EFFFF7 0%, #E3FFEF 50%, #DBFFF0 100%);
        min-height: 100%;
      }
      .container { max-width: 1000px; margin: 24px auto; padding: 0 16px; }
      .card {
        position: relative;
        background: #fff;
        border: 1px solid #d6f5e6;
        border-radius: 16px;
        padding: 16px;
        box-shadow: 0 12px 28px rgba(31,187,112,.16); /* bright, soft */
        color: #0a1633;
      }
      .muted { color: var(--muted); }

      .btn {
        border: none; border-radius: 10px; padding: 8px 12px; font-weight: 700; cursor: pointer;
        transition: transform .08s, box-shadow .12s, filter .12s;
      }
      .btn:active { transform: translateY(1px); }
      .btn-primary {
        background: linear-gradient(90deg,#5b8cff,#19d3a2);
        color: #fff; box-shadow: 0 10px 24px rgba(25,211,162,.24);
      }
      .btn-primary:hover{ box-shadow: 0 14px 30px rgba(25,211,162,.30); }
      .btn-ghost { background: #eef6ff; color: #2b3c6b; border: 1px solid #e2ecff; }
      .btn-ghost:hover { filter: brightness(1.03); }
      .btn-disabled { background: #f0f4fb; color: #93a1c8; cursor: not-allowed; border: 1px solid #e4ecff; }
    `}</style>
  );
}
