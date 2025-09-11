// src/Pages/Dashboard/SizeReduction.jsx
import { useMemo, useState, useCallback, useEffect, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { useDropzone } from "react-dropzone";
import { motion, AnimatePresence } from "framer-motion";

/* =========================================================
   CONFIG
   ========================================================= */
const API_BASE = "https://qr-project-express.onrender.com";         // ← your backend base
const REDUCE_API = `${API_BASE}/api/reduce`;      // ← router mount (/routes/reduce.js)
const MAX_UPLOAD_MB = 25;

/* =========================================================
   UTILITIES
   ========================================================= */
const fmtBytes = (n) => {
  if (n == null) return "-";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.floor(Math.log(n) / Math.log(k)));
  return `${(n / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};
const isImage = (file) => !!file?.type && /^image\/(png|jpe?g|webp)$/i.test(file.type);
const isPdf   = (file) => !!file && (file.type === "application/pdf" || /\.pdf$/i.test(file.name || ""));

/** client-side image compression with canvas */
async function compressImage(
  file,
  { quality = 0.7, maxWidth = 1920, maxHeight = 1920, format = "image/jpeg" } = {}
) {
  const imgUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise((res, rej) => {
      const i = new Image();
      i.onload = () => res(i);
      i.onerror = rej;
      i.src = imgUrl;
    });

    let { width, height } = img;
    const ratio = Math.min(1, maxWidth / width, maxHeight / height);
    width = Math.max(1, Math.round(width * ratio));
    height = Math.max(1, Math.round(height * ratio));

    const canvas = document.createElement("canvas");
    canvas.width = width; canvas.height = height;
    const ctx = canvas.getContext("2d");
    ctx.drawImage(img, 0, 0, width, height);

    const blob = await new Promise((res, rej) =>
      canvas.toBlob((b) => (b ? res(b) : rej(new Error("Canvas toBlob failed"))), format, quality)
    );

    const nameBase = file.name.replace(/\.(png|jpe?g|webp)$/i, "");
    const ext = format === "image/webp" ? "webp" : format === "image/png" ? "png" : "jpg";
    return new File([blob], `${nameBase}_compressed.${ext}`, { type: format, lastModified: Date.now() });
  } finally {
    URL.revokeObjectURL(imgUrl);
  }
}

/* =========================================================
   PAGE
   ========================================================= */
export default function SizeReduction() {
  /* axios with auth + sane timeouts */
  const api = useMemo(() => {
    const i = axios.create({ baseURL: API_BASE, timeout: 60_000 });
    i.interceptors.request.use((cfg) => {
      const t = localStorage.getItem("token");
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    i.interceptors.response.use(
      (r) => r,
      (err) => {
        // surface readable message
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Network error";
        toast.error(msg);
        return Promise.reject(err);
      }
    );
    return i;
  }, []);

  /* state */
  const [file, setFile] = useState(null);
  const [optimized, setOptimized] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [working, setWorking] = useState(false);
  const [dialog, setDialog] = useState(null); // { type: 'done' | 'error', payload }
  const [history, setHistory] = useState([]);

  const [opts, setOpts] = useState({
    quality: 0.7,
    maxW: 1920,
    maxH: 1920,
    format: "image/jpeg", // jpeg | webp | png (MIME)
    serverModeForPdf: true,
  });

  // Keep track of temporary object URLs to revoke on unmount
  const blobUrlsRef = useRef([]);

  const registerBlobUrl = (u) => {
    blobUrlsRef.current.push(u);
    return u;
  };
  const revokeAllBlobUrls = () => {
    blobUrlsRef.current.forEach((u) => {
      try { URL.revokeObjectURL(u); } catch {}
    });
    blobUrlsRef.current = [];
  };

  useEffect(() => revokeAllBlobUrls, []);

  /* user id (optional) */
  const userId = useMemo(() => {
    try { return JSON.parse(localStorage.getItem("user") || "{}")?.id || null; }
    catch { return null; }
  }, []);

  /* dropzone */
  const onDrop = useCallback(
    (accepted) => {
      const f = accepted?.[0];
      if (!f) return;
      if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
        toast.error(`Max ${MAX_UPLOAD_MB}MB`);
        return;
      }
      // reset state
      revokeAllBlobUrls();
      setOptimized(null);
      setDialog(null);
      setFile(f);
      if (isImage(f)) setPreviewUrl(registerBlobUrl(URL.createObjectURL(f)));
      else setPreviewUrl("");
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({
    onDrop,
    noClick: true,
    maxFiles: 1,
    accept: {
      "image/png": [".png"],
      "image/jpeg": [".jpg", ".jpeg"],
      "image/webp": [".webp"],
      "application/pdf": [".pdf"],
      // allow other docs server-side as raw
      "application/octet-stream": [".doc", ".docx", ".ppt", ".pptx"]
    }
  });

  /* load history on mount (optional) */
  useEffect(() => {
    (async () => {
      try {
        if (!userId) return;
        const { data } = await api.get(`${REDUCE_API}`, { params: { user_id: userId } });
        setHistory(Array.isArray(data) ? data : []);
      } catch {/* non-critical */}
    })();
  }, [api, userId]);

  /* helpers */
  const clearAll = () => {
    revokeAllBlobUrls();
    setFile(null);
    setOptimized(null);
    setPreviewUrl("");
    setDialog(null);
  };

  const addHistoryTop = (row) => setHistory((h) => [row, ...h]);

  /* main action */
  async function runReduction() {
    if (!file) {
      toast.info("Pick a file first");
      return;
    }
    setWorking(true);
    setDialog(null);
    setOptimized(null);

    try {
      // Client-side image compression
      if (isImage(file)) {
        const out = await compressImage(file, {
          quality: Number(opts.quality),
          maxWidth: Number(opts.maxW),
          maxHeight: Number(opts.maxH),
          format: opts.format,
        });

        setOptimized(out);

        // Compare sizes & message
        const saved = file.size - out.size;
        if (saved > 0) {
          const pct = ((saved / file.size) * 100).toFixed(2);
          toast.success(`Image compressed: -${fmtBytes(saved)} (${pct}%)`);
        } else {
          toast.info("Compression resulted in a similar size.");
        }

        setDialog({
          type: "done",
          payload: { mode: "client", resultName: out.name, saved },
        });
        return;
      }

      // PDFs / any other documents — send to server
      if (isPdf(file) || opts.serverModeForPdf) {
        const form = new FormData();
        form.append("file", file);
        if (userId) form.append("user_id", userId);
        form.append("quality", String(opts.quality));
        form.append("maxWidth", String(opts.maxW));
        form.append("maxHeight", String(opts.maxH));

        const { data } = await api.post(`${REDUCE_API}/upload`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });

        // data is DB row of the reduction
        addHistoryTop(data);

        // compute pct for UX if available
        let pct = null;
        if (data?.original_size_bytes && data?.optimized_size_bytes) {
          const saved = Number(data.original_size_bytes) - Number(data.optimized_size_bytes);
          pct = saved > 0 ? ((saved / Number(data.original_size_bytes)) * 100).toFixed(2) : "0.00";
        }

        toast.success(`Optimized on server${pct ? ` (-${pct}%)` : ""}`);
        setDialog({
          type: "done",
          payload: { mode: "server", id: data.id, resultName: data.optimized_filename },
        });
        return;
      }

      toast.info("Unsupported file type. Use images (JPG/PNG/WEBP) or PDFs.");
    } catch (e) {
      console.error("runReduction error:", e);
      setDialog({
        type: "error",
        payload: e?.response?.data?.error || e?.message || "Failed to optimize",
      });
    } finally {
      setWorking(false);
    }
  }

  /* =========================================================
     UI
     ========================================================= */
  return (
    <div className="wrap" style={{ maxWidth: 1100, margin: "20px auto" }}>
      <LocalStyles />

      <div className="sr-title">📉 File Size Reduction</div>
     
      <div className="panel">
        {/* Uploader */}
        <div {...getRootProps()} className={`uploader ${isDragActive ? "drag" : ""}`}>
          <input {...getInputProps()} />
          <div className="uploader-line">
            <span>Drag & Drop file here</span>
            <span className="sep">•</span>
            <button
              type="button"
              className="btn btn-accent"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); openPicker(); }}
            >
              Choose file
            </button>
          </div>
          <div className="uploader-hint">
            JPG / PNG / WEBP (handled in browser) • PDF & others (optimized on server) • Max {MAX_UPLOAD_MB}MB
          </div>
        </div>

       {/* Options + Preview */}
<div className="grid-2">
  {/* Options */}
  <div className="box">
    <div className="label"></div>

    {/* Upload document (keeps everything else identical) */}
    <div className="actions" style={{ marginBottom: 8 }}>
      <input
        id="sr-file-input"
        type="file"
        style={{ display: "none" }}
        accept=".png,.jpg,.jpeg,.webp,.pdf,.doc,.docx,.ppt,.pptx"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (!f) return;
          if (f.size > MAX_UPLOAD_MB * 1024 * 1024) {
            toast.error(`Max ${MAX_UPLOAD_MB}MB`);
            e.target.value = "";
            return;
          }
          // reset state for fresh selection
          setOptimized(null);
          setDialog(null);
          setFile(f);
          if (isImage(f)) {
            const url = URL.createObjectURL(f);
            setPreviewUrl(url); // show preview immediately for images
          } else {
            setPreviewUrl(""); // non-image: keep preview empty (no text)
          }
        }}
      />
     
    </div>

    {isImage(file || {}) ? (
      <>
        <label className="label">Quality: {Math.round(opts.quality * 100)}%</label>
        <input
          type="range"
          min={0.2}
          max={1}
          step={0.05}
          className="range"
          value={opts.quality}
          onChange={(e) => setOpts((o) => ({ ...o, quality: Number(e.target.value) }))}
        />

        <div className="grid-2 mini-gap">
          <div>
            <label className="label">Max Width</label>
            <input
              type="number"
              className="input"
              min={1}
              value={opts.maxW}
              onChange={(e) => setOpts((o) => ({ ...o, maxW: Number(e.target.value || 1) }))}
            />
          </div>
          <div>
            <label className="label">Max Height</label>
            <input
              type="number"
              className="input"
              min={1}
              value={opts.maxH}
              onChange={(e) => setOpts((o) => ({ ...o, maxH: Number(e.target.value || 1) }))}
            />
          </div>
        </div>

        <div style={{ marginTop: 8 }}>
          <label className="label">Output Format</label>
          <select
            className="select"
            value={opts.format}
            onChange={(e) => setOpts((o) => ({ ...o, format: e.target.value }))}
          >
            <option value="image/jpeg">JPEG (.jpg)</option>
            <option value="image/webp">WEBP (.webp)</option>
            <option value="image/png">PNG (.png)</option>
          </select>
        </div>
      </>
    ) : (
      <div className="muted" style={{ lineHeight: 1.5 }}>
        {/* no option text */}
      </div>
    )}

    <div className="actions">
      <button className="btn btn-accent" onClick={runReduction} disabled={!file || working}>
        {working ? "Optimizing…" : "Reduce Size"}
      </button>
      <button className="btn btn-light" onClick={clearAll} disabled={working}>
        Clear
      </button>
    </div>

    {/* Stats */}
    <div className="label" style={{ marginTop: 12 }}>Stats</div>
    <div className="stat-row">
      <span className="muted">Original</span>
      <span>{file ? `${file.name} — ${fmtBytes(file.size)}` : "-"}</span>
    </div>
    <div className="stat-row">
      <span className="muted">Optimized</span>
      <span>
        {isImage(file || {}) && optimized
          ? `${optimized.name} — ${fmtBytes(optimized.size)}`
          : (dialog?.payload?.resultName || "-")}
      </span>
    </div>
  </div>

  {/* Preview */}
  <div className="box">
    <div className="label">Preview</div>
    {isImage(file || {}) && previewUrl ? (
      <img className="preview" src={previewUrl} alt="preview" />
    ) : (
      // no message text for PDFs/others or when empty — just an empty placeholder box
      <div className="preview empty" aria-hidden="true" />
    )}

    {/* Server result quick links */}
    {dialog?.type === "done" && dialog?.payload?.mode === "server" && dialog?.payload?.id && (
      <div className="actions" style={{ marginTop: 12 }}>
        <a
          className="btn btn-light"
          href={`${REDUCE_API}/${dialog.payload.id}/preview`}
          target="_blank"
          rel="noreferrer"
        >
          Preview
        </a>
        <a className="btn btn-accent" href={`${REDUCE_API}/${dialog.payload.id}/download`}>
          Download
        </a>
      </div>
  

            )}

            {/* Client optimized actions */}
            {isImage(file || {}) && optimized && (
              <div className="actions" style={{ marginTop: 12 }}>
                <a
                  className="btn btn-accent"
                  href={registerBlobUrl(URL.createObjectURL(optimized))}
                  download={optimized.name}
                >
                  Download Optimized
                </a>
                <button
                  className="btn btn-light"
                  onClick={() => {
                    setFile(optimized);
                    setPreviewUrl(registerBlobUrl(URL.createObjectURL(optimized)));
                    setOptimized(null);
                    toast.success("Set optimized file as new source");
                  }}
                >
                  Use as Source
                </button>
              </div>
            )}
          </div>
        </div>

        {/* History */}
        <div className="box" style={{ marginTop: 12 }}>
          <div className="label">Recent Optimizations</div>
          {history.length ? (
            <div className="hist">
              {history.map((row) => (
                <div className="hist-row" key={row.id}>
                  <div className="hist-main">
                    <div className="hist-name" title={row.optimized_filename || row.original_filename}>
                      {(row.optimized_filename || row.original_filename) || "file"}
                    </div>
                    <div className="muted">
                      {fmtBytes(row.original_size_bytes)} → {fmtBytes(row.optimized_size_bytes)}{" "}
                      {typeof row.reduction_percent === "number" ? `(${row.reduction_percent}%↓)` : ""}
                    </div>
                  </div>
                  <div className="hist-actions">
                    <a className="btn btn-light" href={`${REDUCE_API}/${row.id}/preview`} target="_blank" rel="noreferrer">Preview</a>
                    <a className="btn btn-accent" href={`${REDUCE_API}/${row.id}/download`}>Download</a>
                    <button
                      className="btn btn-danger"
                      onClick={async () => {
                        try {
                          await api.delete(`${REDUCE_API}/${row.id}`);
                          setHistory((h) => h.filter((r) => r.id !== row.id));
                          toast.success("Deleted");
                        } catch {/* toast handled in interceptor */}
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="muted">No previous items.</div>
          )}
        </div>
      </div>

      {/* Centered modal for working */}
      <AnimatePresence>
        {working && (
          <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <motion.div className="modal small" initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}>
              <div className="spinner" aria-label="Optimizing…" />
              <div className="modal-title" style={{ marginTop: 10 }}>Optimizing…</div>
              <p className="muted" style={{ marginTop: 6 }}>Please wait while we reduce your file size.</p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Result / Error modal */}
      <AnimatePresence>
        {dialog?.type && !working && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            onClick={() => setDialog(null)}
          >
            <motion.div
              className="modal small"
              initial={{ y: 24, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 12, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-title">
                {dialog.type === "done" ? "✅ Optimization Complete" : "⚠️ Error"}
              </div>
              {dialog.type === "done" ? (
                <p className="muted">Output: <strong>{dialog.payload?.resultName || "file"}</strong></p>
              ) : (
                <p className="muted">{dialog.payload}</p>
              )}

              <div className="actions" style={{ marginTop: 8 }}>
                {dialog.type === "done" && dialog?.payload?.mode === "server" && dialog?.payload?.id && (
                  <>
                    <a className="btn btn-light" href={`${REDUCE_API}/${dialog.payload.id}/preview`} target="_blank" rel="noreferrer">Preview</a>
                    <a className="btn btn-accent" href={`${REDUCE_API}/${dialog.payload.id}/download`}>Download</a>
                  </>
                )}
                {dialog.type === "done" && isImage(file || {}) && optimized && (
                  <a
                    className="btn btn-accent"
                    href={registerBlobUrl(URL.createObjectURL(optimized))}
                    download={optimized.name}
                  >
                    Download
                  </a>
                )}
                <button className="btn btn-light" onClick={() => setDialog(null)}>Close</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* =========================================================
   LOCAL STYLES (bright, professional)
   ========================================================= */
function LocalStyles() {
  return (
    <style>{`
      .sr-title{font-weight:900;font-size:clamp(18px,2.6vw,24px);color:#2F1B70;margin-bottom:6px}
      .sr-sub{color:#5B3FB8;margin-bottom:12px}

      .panel{
        background:#fff;border:1px solid rgba(124,92,255,.25);border-radius:14px;
        padding:16px;box-shadow:0 14px 36px rgba(124,92,255,.15);
      }

      .uploader{
        border:2px dashed rgba(124,92,255,.45);
        border-radius:14px;padding:16px;text-align:center;
        background:linear-gradient(180deg,#FFFFFF, rgba(246,229,255,.45));
        color:#2F1B70; box-shadow:0 12px 28px rgba(124,92,255,.22);
        transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, filter .18s ease;
        margin-bottom:12px;
      }
      .uploader.drag{
        transform:translateY(-2px);
        border-color:#7C5CFF;
        box-shadow:0 18px 42px rgba(124,92,255,.28);
        filter:saturate(1.04)
      }
      .uploader-line{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
      .uploader .sep{color:rgba(124,92,255,.8)}
      .uploader-hint{margin-top:6px;font-size:12px;color:#5B3FB8}

      .grid-2{display:grid;grid-template-columns:1fr 1fr;gap:12px}
      .grid-2.mini-gap{gap:8px}
      @media (max-width: 820px){ .grid-2{grid-template-columns:1fr} }

      .box{
        background:#fff;border:1px solid rgba(124,92,255,.25);
        border-radius:12px;padding:12px
      }
      .label{font-size:12px;color:#5B3FB8;margin-bottom:6px;font-weight:800}
      .input,.select,.range{
        width:100%;padding:10px;border-radius:10px;border:1px solid rgba(124,92,255,.25);
        background:#FFFFFF;color:#2F1B70;
      }

      .preview{
        width:100%;height:300px;border-radius:10px;border:1px solid rgba(124,92,255,.25);
        object-fit:contain;background:#fff
      }
      .preview.empty{display:grid;place-items:center;color:#5B3FB8;font-size:13px}

      .actions{display:flex;gap:8px;flex-wrap:wrap;margin-top:12px}
      .btn{
        border:none;border-radius:10px;padding:10px 14px;font-weight:900;cursor:pointer;
        transition:transform .08s, box-shadow .12s, filter .12s; letter-spacing:.2px;
      }
      .btn:active{transform:translateY(1px)}
      .btn:focus-visible{outline:3px solid rgba(124,92,255,.28);outline-offset:2px}
      .btn-light{
        background:rgba(255,255,255,.88);
        color:#2F1B70; border:1px solid rgba(124,92,255,.25);
        box-shadow:0 8px 18px rgba(124,92,255,.14);
      }
      .btn-accent{
        background:linear-gradient(90deg,#FF6A3D,#FF4D88,#7C5CFF);
        color:#2F1B70; border:1px solid rgba(255,228,154,.6);
        box-shadow:0 10px 26px rgba(255,77,136,.26);
      }
      .btn-danger{
        background:#FF4D88;color:#fff;border:1px solid rgba(255,228,154,.5);box-shadow:0 10px 22px rgba(255,77,136,.26);
      }

      .stat-row{display:grid;grid-template-columns:140px 1fr;gap:6px;margin-top:6px;color:#2F1B70}
      @media (max-width:560px){ .stat-row{grid-template-columns:1fr} }

      .hist{display:grid;gap:8px;margin-top:8px}
      .hist-row{
        display:grid;grid-template-columns:1fr auto;gap:10px;align-items:center;
        border:1px solid rgba(124,92,255,.22);border-radius:10px;padding:10px;
        background:linear-gradient(180deg,#fff,rgba(246,229,255,.35));
      }
      .hist-actions{display:flex;gap:8px;flex-wrap:wrap}
      .hist-name{font-weight:800;color:#2F1B70;max-width:48vw;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}

      /* Centered modals + spinner */
      .modal-backdrop{
        position:fixed;inset:0;background:rgba(124,92,255,.20);
        backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:12px
      }
      .modal{
        width:min(520px,92vw);background:#fff;border:1px solid rgba(124,92,255,.25);border-radius:14px;
        box-shadow:0 24px 64px rgba(34,211,238,.28);padding:18px
      }
      .modal.small{width:min(420px,92vw)}
      .modal-title{font-weight:900;color:#2F1B70;font-size:18px}
      .muted{color:#5B3FB8}

      .spinner{
        width:44px;height:44px;border-radius:999px;
        border:4px solid rgba(124,92,255,.25);
        border-top-color:#7C5CFF; animation:spin 0.8s linear infinite;
        margin: 0 auto;
      }
      @keyframes spin{ to { transform: rotate(360deg);} }
    `}</style>
  );
}
