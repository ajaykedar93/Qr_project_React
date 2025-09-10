// src/Pages/Conert.jsx
import React, { useRef, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import {
  FaFilePdf,
  FaImage,
  FaCompressAlt,
  FaUpload,
  FaDownload,
  FaSpinner,
  FaFolderOpen,
  FaPlay,
  FaEye,
  FaLink,
  FaCog,
} from "react-icons/fa";

const API_BASE = "https://qr-project-express.onrender.com";

/* Axios with auth header from localStorage */
const api = axios.create({ baseURL: API_BASE });
api.interceptors.request.use((cfg) => {
  const t = localStorage.getItem("token");
  if (t) cfg.headers.Authorization = `Bearer ${t}`;
  return cfg;
});

export default function Conert() {
  /* Sources */
  const [localFile, setLocalFile] = useState(null);        // File picked now
  const [serverFile, setServerFile] = useState(null);      // { blob, name, mime } from /documents/download/:id
  const currentSource = serverFile?.blob || localFile || null;
  const currentName =
    (serverFile && serverFile.name) || (localFile && localFile.name) || "";

  /* State */
  const [busy, setBusy] = useState(false);
  const [busyAction, setBusyAction] = useState(""); // 'upload'|'list'|'download'|'docx2pdf'|'pdf2jpg'|'compressPdf'|'compressImg'
  const [progress, setProgress] = useState(0);
  const [jpgList, setJpgList] = useState([]);

  /* Docs */
  const [docs, setDocs] = useState([]);
  const [docsLoaded, setDocsLoaded] = useState(false);
  const [lastUploaded, setLastUploaded] = useState(null);

  /* Controls */
  const [pdfPreset, setPdfPreset] = useState("screen"); // screen|ebook|printer|prepress
  const [jpgDpi, setJpgDpi] = useState(150);            // 72..300
  const [imgQ, setImgQ] = useState(75);                 // 1..100

  const inputRef = useRef();

  function onPick() {
    inputRef.current?.click();
  }

  function onLocalFileChange(e) {
    const f = e.target.files?.[0];
    handleNewLocalFile(f);
  }

  function handleNewLocalFile(f) {
    if (!f) return;
    if (f.size > 25 * 1024 * 1024) {
      toast.error("Max 25MB allowed");
      return;
    }
    setLocalFile(f);
    setServerFile(null);
    setJpgList([]);
    uploadToDocuments(f);
  }

  async function uploadToDocuments(file) {
    try {
      setBusy(true);
      setBusyAction("upload");
      setProgress(0);

      const form = new FormData();
      form.append("file", file);

      const { data } = await api.post("/documents/upload", {
        ...form,
      }, {
        headers: { "Content-Type": "multipart/form-data" },
        onUploadProgress: (pe) => {
          if (!pe.total) return;
          setProgress(Math.round((pe.loaded / pe.total) * 100));
        },
      });

      setLastUploaded(data);
      toast.success("Uploaded to your documents");
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Upload failed");
    } finally {
      setBusy(false);
      setBusyAction("");
      setProgress(0);
    }
  }

  async function loadMyDocuments() {
    try {
      setBusy(true);
      setBusyAction("list");
      const { data } = await api.get("/documents");
      setDocs(Array.isArray(data) ? data : []);
      setDocsLoaded(true);
      if (!Array.isArray(data) || !data.length) {
        toast.info("No documents yet");
      }
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Failed to load documents");
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  }

  async function useServerDocument(doc) {
    try {
      setBusy(true);
      setBusyAction("download");
      const res = await api.get(`/documents/download/${doc.document_id}`, {
        responseType: "blob",
      });
      const blob = res.data;
      setServerFile({
        blob,
        name: doc.file_name || "document",
        mime: doc.mime_type || "application/octet-stream",
      });
      setLocalFile(null);
      setJpgList([]);
      toast.success(`Selected "${doc.file_name}" for conversion`);
    } catch (e) {
      toast.error(e?.response?.data?.error || e?.message || "Download failed");
    } finally {
      setBusy(false);
      setBusyAction("");
    }
  }

  /* Core action runner — uses currentSource (server blob or local file) */
  async function runAction(url, { expectJson = false, downloadName, actionKey }) {
    if (!currentSource) {
      toast.error("Please upload a file or select one from My Documents");
      return;
    }
    try {
      setBusy(true);
      setBusyAction(actionKey);
      setProgress(0);

      const form = new FormData();
      const toSend =
        currentSource instanceof Blob && !(currentSource instanceof File)
          ? new File([currentSource], currentName || "input", {
              type: currentSource.type || "application/octet-stream",
            })
          : currentSource;
      form.append("file", toSend);

      const res = await axios.post(`${API_BASE}${url}`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        responseType: expectJson ? "json" : "blob",
        onUploadProgress: (pe) => {
          if (!pe.total) return;
          setProgress(Math.round((pe.loaded / pe.total) * 100));
        },
      });

      if (expectJson) {
        const files = (res.data?.files || []).map((p) =>
          p.startsWith("http") ? p : `${API_BASE}${p}`
        );
        setJpgList(files);
        toast.success(`Converted to ${files.length} image${files.length === 1 ? "" : "s"}`);
      } else {
        const blob = res.data;
        const name = downloadName || suggestDownloadName(currentName, url);
        triggerDownload(blob, name);
        toast.success("Downloaded");
      }
    } catch (e) {
      toast.error(e?.response?.data || e?.message || "Operation failed");
    } finally {
      setBusy(false);
      setBusyAction("");
      setProgress(0);
    }
  }

  /* ---------- UI sections ---------- */

  const header = (
    <div style={row({ gap: 12, mb: 20 })}>
      <FaUpload size={32} color="#7C5CFF" />
      <div>
        <h1 style={gradH1}>Smart Document Converter</h1>
        <p style={muted}>Upload once (saved to your account), then convert & compress. Max 25MB.</p>
      </div>
      <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 8 }}>
        <FaLink aria-hidden />
        <code style={{ fontSize: 12, color: "#2F1B70" }}>
          {API_BASE || "VITE_API_BASE not set"}
        </code>
      </div>
    </div>
  );

  const uploadCard = (
    <div
      style={cardDashed}
      onDragOver={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      onDrop={(e) => {
        e.preventDefault();
        e.stopPropagation();
        const f = e.dataTransfer.files?.[0];
        handleNewLocalFile(f);
      }}
    >
      <input
        ref={inputRef}
        type="file"
        style={{ display: "none" }}
        onChange={onLocalFileChange}
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,image/jpeg,image/png"
      />
      <p style={{ margin: 8 }}>Drag & Drop or</p>
      <button onClick={onPick} style={btnAccent()}>
        Choose File
      </button>

      {(localFile || serverFile) && (
        <p style={{ marginTop: 12, fontSize: 14, color: "#333" }}>
          Selected: <b>{currentName}</b>{" "}
          {localFile ? `(${(localFile.size / 1024 / 1024).toFixed(2)} MB)` : ""}
        </p>
      )}

      {lastUploaded && (
        <div style={pillInfo} title="Last uploaded to your account">
          <FaPlay /> Saved as: <b>{lastUploaded.file_name}</b>
        </div>
      )}
    </div>
  );

  const controls = (
    <div style={controlWrap}>
      <div style={controlGroup}>
        <label style={lbl}><FaCog style={{ marginRight: 6 }} /> PDF Compress preset</label>
        <select
          value={pdfPreset}
          onChange={(e) => setPdfPreset(e.target.value)}
          style={input}
        >
          <option value="screen">Screen (smallest)</option>
          <option value="ebook">eBook</option>
          <option value="printer">Printer</option>
          <option value="prepress">Prepress (best)</option>
        </select>
      </div>

      <div style={controlGroup}>
        <label style={lbl}><FaImage style={{ marginRight: 6 }} /> PDF → JPG DPI: {jpgDpi} </label>
        <input
          type="range"
          min={72}
          max={300}
          step={6}
          value={jpgDpi}
          onChange={(e) => setJpgDpi(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <small style={muted}>Higher DPI = clearer JPGs, larger size.</small>
      </div>

      <div style={controlGroup}>
        <label style={lbl}><FaCompressAlt style={{ marginRight: 6 }} /> Image quality (JPG): {imgQ}</label>
        <input
          type="range"
          min={1}
          max={100}
          value={imgQ}
          onChange={(e) => setImgQ(Number(e.target.value))}
          style={{ width: "100%" }}
        />
        <small style={muted}>Lower quality = smaller file.</small>
      </div>
    </div>
  );

  const myDocsBar = (
    <div style={row({ mt: 14, gap: 10 })}>
      <button disabled={busy && busyAction !== "list"} onClick={loadMyDocuments} style={btnSecondary()}>
        <FaFolderOpen /> {docsLoaded ? "Refresh My Documents" : "Load My Documents"}
      </button>
      <span style={{ fontSize: 12, color: "#666" }}>Pick any uploaded file to use for conversion.</span>
    </div>
  );

  const docsGrid =
    docsLoaded && (
      <div style={{ marginTop: 10 }}>
        {!docs.length ? (
          <div style={emptyNote}>No documents yet. Upload a file above to add one.</div>
        ) : (
          <div style={gridCards}>
            {docs.map((d) => (
              <div key={d.document_id} style={docCard}>
                <div style={docTitle}>{d.file_name}</div>
                <div style={docMeta}>{d.mime_type || "file"} • {fmtBytes(d.file_size_bytes)}</div>
                <div style={row({ gap: 8, wrap: true })}>
                  <a
                    href={`${API_BASE}/documents/view/${d.document_id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={btnLight()}
                  >
                    <FaEye /> View
                  </a>
                  <a href={`${API_BASE}/documents/download/${d.document_id}`} style={btnLight()}>
                    <FaDownload /> Download
                  </a>
                  <button disabled={busy} onClick={() => useServerDocument(d)} style={btnPrimary()}>
                    Use
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    );

  const actions =
    (localFile || serverFile) && (
      <div style={row({ mt: 18, gap: 12, wrap: true, center: true })}>
        <ActionButton
          disabled={busy}
          color="#FF6A3D"
          icon={busy && busyAction === "docx2pdf" ? <SpinIcon /> : <FaFilePdf />}
          label="Word → PDF"
          onClick={() =>
            runAction(`/convert/docx-to-pdf`, {
              expectJson: false,
              downloadName: "converted.pdf",
              actionKey: "docx2pdf",
            })
          }
        />
        <ActionButton
          disabled={busy}
          color="#22D3EE"
          icon={busy && busyAction === "pdf2jpg" ? <SpinIcon /> : <FaImage />}
          label={`PDF → JPG (${jpgDpi} DPI)`}
          onClick={() =>
            runAction(`/convert/pdf-to-jpg?dpi=${jpgDpi}`, {
              expectJson: true,
              actionKey: "pdf2jpg",
            })
          }
        />
        <ActionButton
          disabled={busy}
          color="#FF4D88"
          icon={busy && busyAction === "compressPdf" ? <SpinIcon /> : <FaCompressAlt />}
          label={`Reduce PDF (${pdfPreset})`}
          onClick={() =>
            runAction(`/compress/pdf?preset=${encodeURIComponent(pdfPreset)}`, {
              expectJson: false,
              downloadName: "compressed.pdf",
              actionKey: "compressPdf",
            })
          }
        />
        <ActionButton
          disabled={busy}
          color="#2F1B70"
          icon={busy && busyAction === "compressImg" ? <SpinIcon /> : <FaCompressAlt />}
          label={`Reduce Image (q=${imgQ})`}
          onClick={() =>
            runAction(`/compress/image?q=${imgQ}`, {
              expectJson: false,
              downloadName: "compressed-image.jpg",
              actionKey: "compressImg",
            })
          }
        />
      </div>
    );

  const progressBar =
    busy && (
      <div style={{ marginTop: 14 }}>
        <div style={barOuter}>
          <div
            style={{
              height: "100%",
              width: `${Math.max(5, progress)}%`,
              background: "linear-gradient(90deg,#FF6A3D,#FF4D88,#7C5CFF,#22D3EE)",
              transition: "width .2s ease",
            }}
          />
        </div>
        <div style={barMeta}>
          <span>{busyActionLabel(busyAction)}</span>
          <span>{progress}%</span>
        </div>
      </div>
    );

  const jpgPreview =
    jpgList.length > 0 && (
      <div style={{ marginTop: 22 }}>
        <h3 style={{ fontWeight: 700, fontSize: "1.05rem", margin: "0 0 10px" }}>
          Preview ({jpgList.length} pages)
        </h3>
        <div style={gridPreview}>
          {jpgList.map((src, i) => (
            <div key={i} style={prevCard}>
              <img src={src} alt={`page-${i + 1}`} style={{ width: "100%", display: "block" }} />
              <a href={src} download={`page-${i + 1}.jpg`} style={prevDl}>
                <FaDownload /> Download
              </a>
            </div>
          ))}
        </div>
      </div>
    );

  return (
    <div style={page}>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      {header}
      {uploadCard}
      {controls}
      {myDocsBar}
      {docsGrid}
      {actions}
      {progressBar}
      {jpgPreview}
    </div>
  );
}

/* ---------- Components ---------- */

function ActionButton({ color, icon, label, onClick, disabled }) {
  return (
    <button
      disabled={disabled}
      onClick={onClick}
      style={{
        border: "none",
        borderRadius: 12,
        padding: "12px 18px",
        fontWeight: 700,
        color: "#fff",
        background: color,
        display: "flex",
        alignItems: "center",
        gap: 10,
        cursor: disabled ? "not-allowed" : "pointer",
        flex: "1 1 220px",
        justifyContent: "center",
        boxShadow: "0 10px 24px rgba(0,0,0,.10)",
        opacity: disabled ? 0.75 : 1,
        minWidth: 220,
      }}
      aria-busy={disabled}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}

function SpinIcon() {
  return <FaSpinner style={{ animation: "spin .9s linear infinite" }} aria-label="loading" />;
}

/* ---------- Styles / Utils ---------- */

const page = {
  maxWidth: 980,
  margin: "0 auto",
  padding: 16,
  fontFamily: "Segoe UI, system-ui, -apple-system, sans-serif",
  color: "#1f1f1f",
};

const gradH1 = {
  margin: 0,
  fontSize: "1.6rem",
  fontWeight: 800,
  background: "linear-gradient(90deg,#FF6A3D,#FF4D88,#7C5CFF,#22D3EE)",
  WebkitBackgroundClip: "text",
  color: "transparent",
};

const muted = { margin: 0, fontSize: 13, color: "#5B3FB8" };

const cardDashed = {
  border: "2px dashed #7C5CFF",
  borderRadius: 14,
  padding: 24,
  textAlign: "center",
  background: "linear-gradient(180deg,#fff,#f6f2ff)",
};

const pillInfo = {
  marginTop: 12,
  fontSize: 13,
  color: "#2F1B70",
  display: "inline-flex",
  gap: 8,
  alignItems: "center",
  padding: "8px 10px",
  background: "rgba(34,211,238,.12)",
  border: "1px solid rgba(34,211,238,.35)",
  borderRadius: 10,
};

const controlWrap = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))",
  gap: 12,
  marginTop: 14,
};

const controlGroup = {
  border: "1px solid rgba(124,92,255,.25)",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  boxShadow: "0 8px 20px rgba(34,211,238,.12)",
};

const lbl = { fontSize: 13, fontWeight: 800, color: "#2F1B70", display: "flex", alignItems: "center", marginBottom: 8 };

const input = {
  width: "100%",
  padding: 10,
  borderRadius: 10,
  border: "1px solid rgba(124,92,255,.35)",
  background: "#FFFFFF",
  color: "#2F1B70",
};

const emptyNote = {
  padding: 12,
  textAlign: "center",
  border: "1px dashed #cbd5ff",
  borderRadius: 10,
  background: "linear-gradient(180deg,#fff,rgba(230,248,255,.45))",
  color: "#5B3FB8",
  fontSize: 14,
};

const gridCards = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))",
  gap: 12,
};

const docCard = {
  border: "1px solid rgba(124,92,255,.25)",
  borderRadius: 12,
  background: "#fff",
  padding: 12,
  boxShadow: "0 8px 22px rgba(34,211,238,.16)",
  display: "grid",
  gap: 8,
};

const docTitle = { fontWeight: 900, fontSize: 14, color: "#2F1B70", wordBreak: "break-word" };
const docMeta = { fontSize: 12, color: "#5B3FB8" };

const gridPreview = {
  display: "grid",
  gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))",
  gap: 12,
};

const prevCard = {
  border: "1px solid #ddd",
  borderRadius: 10,
  overflow: "hidden",
  background: "#fff",
};

const prevDl = {
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 6,
  padding: 8,
  fontSize: 14,
  background: "#f6f6f6",
  textDecoration: "none",
  color: "#1f1f1f",
};

const barOuter = {
  height: 10,
  width: "100%",
  background: "#eee",
  borderRadius: 999,
  overflow: "hidden",
  boxShadow: "inset 0 0 0 1px #e2e2e2",
};

const barMeta = {
  marginTop: 6,
  fontSize: 12,
  color: "#555",
  display: "flex",
  justifyContent: "space-between",
};

function row({ gap = 8, mb = 0, mt = 0, wrap = false, center = false } = {}) {
  return {
    display: "flex",
    alignItems: "center",
    gap,
    marginBottom: mb,
    marginTop: mt,
    flexWrap: wrap ? "wrap" : "nowrap",
    justifyContent: center ? "center" : "flex-start",
  };
}

/* Buttons */
function btnAccent() {
  return {
    border: "none",
    borderRadius: 10,
    padding: "10px 16px",
    fontWeight: 800,
    background: "#7C5CFF",
    color: "#fff",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(124,92,255,.28)",
  };
}

function btnPrimary() {
  return {
    border: "none",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    color: "#fff",
    background: "#7C5CFF",
    cursor: "pointer",
    boxShadow: "0 10px 22px rgba(124,92,255,.28)",
  };
}

function btnLight() {
  return {
    border: "1px solid rgba(124,92,255,.25)",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    color: "#2F1B70",
    background: "rgba(255,255,255,.92)",
    textDecoration: "none",
    cursor: "pointer",
  };
}

function btnSecondary() {
  return {
    border: "1px solid rgba(124,92,255,.35)",
    borderRadius: 10,
    padding: "8px 12px",
    fontWeight: 800,
    color: "#2F1B70",
    background: "linear-gradient(180deg,#FFFFFF,rgba(230,248,255,.65))",
    display: "inline-flex",
    alignItems: "center",
    gap: 8,
    cursor: "pointer",
  };
}

/* Labels / helpers */
function busyActionLabel(key) {
  switch (key) {
    case "upload": return "Uploading file…";
    case "list": return "Loading your documents…";
    case "download": return "Preparing file…";
    case "docx2pdf": return "Converting Word → PDF…";
    case "pdf2jpg": return "Converting PDF → JPG…";
    case "compressPdf": return "Compressing PDF…";
    case "compressImg": return "Compressing Image…";
    default: return "Working…";
  }
}

function suggestDownloadName(name, url) {
  const base = (name || "document").replace(/\.[^.]+$/, "");
  if (url.includes("docx-to-pdf")) return `${base}-converted.pdf`;
  if (url.includes("compress/pdf")) return `${base}-compressed.pdf`;
  if (url.includes("compress/image")) return `${base}-image-min.jpg`;
  return "output.bin";
}

function fmtBytes(n) {
  if (n == null) return "-";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.floor(Math.log(n) / Math.log(k)));
  return `${(n / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
}

function triggerDownload(blob, name) {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = name || "download";
  document.body.appendChild(link);
  link.click();
  setTimeout(() => {
    URL.revokeObjectURL(link.href);
    document.body.removeChild(link);
  }, 0);
}
