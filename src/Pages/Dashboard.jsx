// src/Pages/Dashboard.jsx
import { useEffect, useMemo, useState, useRef } from "react";
import axios from "axios";
import { toast } from "react-toastify";
import { motion, AnimatePresence } from "framer-motion";
import { useDropzone } from "react-dropzone";

const API_BASE = "https://qr-project-v0h4.onrender.com";
const FRONTEND_URL = "https://qr-project-react-n8xx.vercel.app";

// ---------- helpers ----------
const qrImgForShareId = (share_id) => {
  if (!share_id) return "";
  const url = `${FRONTEND_URL}/share/${share_id}`;
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(url)}`;
};
const fmtBytes = (n) => {
  if (n == null) return "-";
  const k = 1024, sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.floor(Math.log(n) / Math.log(k)));
  return `${(n / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};
const saveCache = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };
const readCache = (k, f) => { try { return JSON.parse(localStorage.getItem(k) || "null") ?? f; } catch { return f; } };

// email regex (loose but practical)
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// ---------- component ----------
export default function Dashboard() {
  const user = useMemo(() => JSON.parse(localStorage.getItem("user") || "{}"), []);
  const [activeTab, setActiveTab] = useState("docs");

  // axios (auth)
  const api = useMemo(() => {
    const i = axios.create({ baseURL: API_BASE });
    i.interceptors.request.use((cfg) => {
      const t = localStorage.getItem("token");
      if (t) cfg.headers.Authorization = `Bearer ${t}`;
      return cfg;
    });
    return i;
  }, []);

  // state
  const [loading, setLoading] = useState(true);
  const [docs, setDocs] = useState(() => readCache("docs_cache", []));
  const [myShares, setMyShares] = useState(() => readCache("myshares_cache", []));
  const [received, setReceived] = useState(() => readCache("received_cache", []));
  const privateShares = useMemo(() => myShares.filter((s) => s.access === "private"), [myShares]);
  const publicShares  = useMemo(() => myShares.filter((s) => s.access === "public"),  [myShares]);

  // share modal
  const [shareFor, setShareFor] = useState(null); // document_id
  const [shareForm, setShareForm] = useState({ to_user_email: "", expiry_time: "", access: "private" });
  const [shareResult, setShareResult] = useState(null);
  const [notifying, setNotifying] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(null); // true | false | null
  const emailCheckSeq = useRef(0);

  // modals: delete doc, delete share, edit expiry, expire now feedback
  const [modal, setModal] = useState(null);

  // upload
  const onDrop = (accepted) => accepted?.[0] && uploadFile(accepted[0]);
  const { getRootProps, getInputProps, isDragActive, open: openPicker } = useDropzone({ onDrop, noClick: true });

  // load
  async function load() {
    try {
      setLoading(true);
      const [a, b, c] = await Promise.all([
        api.get("/documents"),
        api.get("/shares/mine"),
        api.get("/shares/received"),
      ]);
      setDocs(a.data || []); setMyShares(b.data || []); setReceived(c.data || []);
      saveCache("docs_cache", a.data || []); saveCache("myshares_cache", b.data || []); saveCache("received_cache", c.data || []);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []); // eslint-disable-line

  // upload
  async function uploadFile(file) {
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/documents/upload", form, { headers: { "Content-Type": "multipart/form-data" } });
      setDocs((d) => { const n = [data, ...d]; saveCache("docs_cache", n); return n; });
      toast.success("Uploaded");
    } catch { toast.error("Upload failed"); }
  }

  // delete doc (with modal)
  function askDeleteDoc(d) {
    setModal({ type: "deleteDoc", document_id: d.document_id, file_name: d.file_name });
  }
  async function confirmDeleteDoc() {
    if (!modal?.document_id) return;
    try {
      await api.delete(`/documents/${modal.document_id}`);
      setDocs((d) => { const n = d.filter((x) => x.document_id !== modal.document_id); saveCache("docs_cache", n); return n; });
      toast.success("Document deleted");
      setModal(null);
    } catch { toast.error("Delete failed"); }
  }

  // revoke (kept)
  async function revokeShare(share_id) {
    try {
      await api.post(`/shares/${share_id}/revoke`);
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine); saveCache("myshares_cache", mine);
      toast.success("Share revoked");
    } catch { toast.error("Failed to revoke"); }
  }

  // delete share (new API)
  function askDeleteShare(share_id) {
    setModal({ type: "deleteShare", share_id });
  }
  async function confirmDeleteShare() {
    if (!modal?.share_id) return;
    try {
      await api.delete(`/shares/${modal.share_id}`);
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine); saveCache("myshares_cache", mine);
      toast.success("Share deleted");
      setModal(null);
    } catch { toast.error("Failed to delete share"); }
  }

  // expiry: open modal
  function openEditExpiry(share) {
    setModal({ type: "editExpiry", share_id: share.share_id, current: share.expiry_time || "" });
  }
  async function submitExpiry(newISO) {
    try {
      await api.patch(`/shares/${modal.share_id}/expiry`, { expiry_time: newISO || null });
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine); saveCache("myshares_cache", mine);
      toast.success(newISO ? "Expiry updated" : "Expiry removed");
      setModal(null);
    } catch (e) {
      toast.error(e?.response?.data?.error || "Failed to update expiry");
    }
  }
  async function expireNow(share_id) {
    try {
      await api.post(`/shares/${share_id}/expire-now`);
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine); saveCache("myshares_cache", mine);
      toast.success("Share expired");
    } catch { toast.error("Failed to expire"); }
  }

  // notify via server (includes link + embedded QR)
  async function notifyShare(share_id, email) {
    try { setNotifying(true); await api.post("/shares/notify-share", { share_id }); toast.success(`Email sent to ${email || "recipient"}`); }
    catch { toast.error("Failed to send email"); }
    finally { setNotifying(false); }
  }

  // create share (+ send email immediately if provided)
  async function createShare() {
    try {
      const payload = {
        document_id: shareFor,
        to_email: shareForm.to_user_email || null,
        expiry_time: shareForm.expiry_time || null,
        access: shareForm.access,
      };
      const { data } = await api.post("/shares", payload);

      const result = { ...data, url: `${FRONTEND_URL}/share/${data.share_id}`, to_user_email: shareForm.to_user_email };
      setShareResult(result);

      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine); saveCache("myshares_cache", mine);

      if (result.to_user_email) await notifyShare(result.share_id, result.to_user_email);
      else toast.success("Share created");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Share failed");
    }
  }

  // real-time email check in share modal
  useEffect(() => {
    const raw = (shareForm.to_user_email || "").trim();
    if (!raw) { setEmailExists(null); setCheckingEmail(false); return; }
    if (!emailRe.test(raw)) { setEmailExists(null); setCheckingEmail(false); return; }

    const seq = ++emailCheckSeq.current;
    setCheckingEmail(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/auth/exists", { params: { email: raw.toLowerCase() } });
        if (seq !== emailCheckSeq.current) return;
        setEmailExists(!!data?.exists);
        // nudge access choice (user may override)
        setShareForm((s) => {
          if (data?.exists && s.access !== "private") return { ...s, access: "private" };
          if (!data?.exists && s.access !== "public") return { ...s, access: "public" };
          return s;
        });
      } catch {
        if (seq !== emailCheckSeq.current) return;
        setEmailExists(null);
      } finally {
        if (seq === emailCheckSeq.current) setCheckingEmail(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [shareForm.to_user_email, api]);

  // ---------- UI helpers ----------
  const Tab = ({ id, label, color }) => (
    <button
      onClick={() => setActiveTab(id)}
      className={`tab ${activeTab === id ? "active" : ""}`}
      style={{ ["--tab-accent"]: color }}
    >
      {label}
    </button>
  );

  const DocRow = ({ d }) => (
    <tr>
      <td>
        <div className="cell-title">
          <span className="file-name">{d.file_name}</span>
          <span className="file-meta">{d.mime_type || "file"}</span>
        </div>
      </td>
      <td className="center">
        {d.is_public ? <span className="chip chip-green">PUBLIC</span> : <span className="chip chip-violet">PRIVATE</span>}
      </td>
      <td className="center">{fmtBytes(d.file_size_bytes)}</td>
      <td className="actions">
        {/* Owner preview of any format in a NEW TAB */}
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/view/${d.document_id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open in a new tab"
        >
          Open
        </a>
        <button
          className="btn btn-accent"
          onClick={() => {
            setShareFor(d.document_id);
            setShareForm({ to_user_email: "", expiry_time: "", access: "private" });
            setShareResult(null);
          }}
        >
          Share
        </button>
        <button className="btn btn-danger" onClick={() => askDeleteDoc(d)}>Delete</button>
      </td>
    </tr>
  );

  const SentRow = ({ s }) => (
    <tr>
      <td>
        <button className="linkish" title="Share details">
          {s.file_name || s.document_id}
        </button>
        <div className="muted">
          {s.expiry_time ? <>Expires: {s.expiry_time}</> : <>No expiry</>}
        </div>
      </td>
      <td className="center">
        {s.access === "public" ? <span className="chip chip-green">PUBLIC</span> : <span className="chip chip-violet">PRIVATE</span>}
      </td>
      <td className="qr">
        <img
          src={qrImgForShareId(s.share_id)}
          alt="QR"
          className="qr-img"
          onClick={() => window.open(`${FRONTEND_URL}/share/${s.share_id}`, "_blank", "noopener,noreferrer")}
          title="Open share in new tab"
        />
      </td>
      <td className="actions">
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/share/${s.share_id}`}
          target="_blank"
          rel="noopener noreferrer"
          title="Open share page"
        >
          Open
        </a>
        <button className="btn btn-light" onClick={() => openEditExpiry(s)} title="Set or change expiry">Expiry…</button>
        <button className="btn btn-light" onClick={() => expireNow(s.share_id)} title="Expire immediately">Expire now</button>
        <button className="btn btn-danger" onClick={() => revokeShare(s.share_id)} title="Revoke access">Revoke</button>
        <button className="btn btn-danger" onClick={() => askDeleteShare(s.share_id)} title="Delete share permanently">Delete</button>
      </td>
    </tr>
  );

  const RecvRow = ({ r }) => (
    <tr>
      <td>
        <div className="cell-title">
          <span className="file-name">{r.file_name}</span>
          <span className="file-meta">
            From {r.from_full_name || ""} {r.from_email ? `(${r.from_email})` : ""}
          </span>
        </div>
      </td>
      <td className="center">
        {r.access === "public" ? <span className="chip chip-green">PUBLIC</span> : <span className="chip chip-violet">PRIVATE</span>}
      </td>
      <td className="qr">
        <img
          src={qrImgForShareId(r.share_id)}
          alt="QR"
          className="qr-img"
          onClick={() => window.open(`${FRONTEND_URL}/share/${r.share_id}`, "_blank", "noopener,noreferrer")}
          title="Open share in new tab"
        />
      </td>
      <td className="actions">
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/share/${r.share_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open
        </a>
      </td>
    </tr>
  );

  // ---------- render ----------
  return (
    <div className="wrap">
      <StyleBright />

      {/* Header */}
      <div className="header">
        <div className="brand">QR-Docs</div>
        <div className="who">{user?.email}</div>
      </div>

      {/* Uploader */}
      <motion.div
        {...getRootProps()}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className={`uploader ${isDragActive ? "drag" : ""}`}
      >
        <input {...getInputProps()} />
        <div>
          Drag &amp; Drop to upload
          <span className="sep">•</span>
          <button
            type="button"
            className="btn btn-accent"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); openPicker(); }}
          >
            Choose file
          </button>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="tabs">
        <Tab id="docs"     label="📂 My Documents"   color="#7c4dff" />
        <Tab id="private"  label="🔒 Private Shares" color="#b07aff" />
        <Tab id="public"   label="🌍 Public Shares"  color="#8e63ff" />
        <Tab id="received" label="📥 Received"       color="#c39bff" />
      </div>

      {/* Content */}
      <div className="panel">
        {activeTab === "docs" && (
          loading ? <div className="muted">Loading…</div> :
          docs.length ? (
            <div className="table-responsive">
              <table className="grid">
                <thead>
                  <tr><th>Name</th><th className="center">Access</th><th className="center">Size</th><th>Actions</th></tr>
                </thead>
                <tbody>{docs.map((d) => <DocRow key={d.document_id} d={d} />)}</tbody>
              </table>
            </div>
          ) : <div className="muted">No documents yet.</div>
        )}

        {activeTab === "private" && (
          loading ? <div className="muted">Loading…</div> :
          privateShares.length ? (
            <div className="table-responsive">
              <table className="grid">
                <thead>
                  <tr><th>Document</th><th className="center">Access</th><th className="center">QR</th><th>Actions</th></tr>
                </thead>
                <tbody>{privateShares.map((s) => <SentRow key={s.share_id} s={s} />)}</tbody>
              </table>
            </div>
          ) : <div className="muted">No private shares yet.</div>
        )}

        {activeTab === "public" && (
          loading ? <div className="muted">Loading…</div> :
          publicShares.length ? (
            <div className="table-responsive">
              <table className="grid">
                <thead>
                  <tr><th>Document</th><th className="center">Access</th><th className="center">QR</th><th>Actions</th></tr>
                </thead>
                <tbody>{publicShares.map((s) => <SentRow key={s.share_id} s={s} />)}</tbody>
              </table>
            </div>
          ) : <div className="muted">No public shares yet.</div>
        )}

        {activeTab === "received" && (
          loading ? <div className="muted">Loading…</div> :
          received.length ? (
            <div className="table-responsive">
              <table className="grid">
                <thead>
                  <tr><th>Document</th><th className="center">Access</th><th className="center">QR</th><th>Open</th></tr>
                </thead>
                <tbody>{received.map((r) => <RecvRow key={r.share_id} r={r} />)}</tbody>
              </table>
            </div>
          ) : <div className="muted">No shares received.</div>
        )}
      </div>

      {/* Share modal */}
      <AnimatePresence>
        {shareFor && (
          <motion.div
            className="modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => { setShareFor(null); setShareResult(null); setEmailExists(null); }}
          >
            <motion.div
              className="modal"
              onClick={(e) => e.stopPropagation()}
              initial={{ y: 28, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 20, opacity: 0 }}
            >
              <h3 className="modal-title">Share document</h3>

              <div className="form-grid">
                <label className="lbl">Recipient email</label>
                <div>
                  <input
                    className="input"
                    placeholder="you@example.com (optional for public)"
                    value={shareForm.to_user_email}
                    onChange={(e) => setShareForm((s) => ({ ...s, to_user_email: e.target.value }))}
                    autoComplete="email"
                  />
                  {!!shareForm.to_user_email && (
                    <div className="hint">
                      {checkingEmail ? "Checking…" :
                        emailExists === true ? "Registered user found — Private recommended." :
                        emailExists === false ? "Not registered — Public recommended." :
                        ""}
                    </div>
                  )}
                </div>

                <label className="lbl">Access</label>
                <select
                  className="input"
                  value={shareForm.access}
                  onChange={(e) => setShareForm((s) => ({ ...s, access: e.target.value }))}
                >
                  <option value="private">Private (OTP, can download)</option>
                  <option value="public">Public (view only)</option>
                </select>

                <label className="lbl">Expiry (optional)</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={shareForm.expiry_time}
                  onChange={(e) => setShareForm((s) => ({ ...s, expiry_time: e.target.value }))}
                />
              </div>

              <div className="modal-actions">
                <button className="btn btn-accent" onClick={createShare}>Create &amp; Send</button>
                <button className="btn btn-light" onClick={() => { setShareFor(null); setShareResult(null); setEmailExists(null); }}>Close</button>
              </div>

              {shareResult && (
                <div className="result">
                  <p className="ok">
                    ✅ Share created{shareResult.to_user_email ? ` and email sent to ${shareResult.to_user_email}.` : "."}
                  </p>
                  <div className="qr-row">
                    <img src={qrImgForShareId(shareResult.share_id)} alt="QR" className="qr-big" />
                    <div className="link-box">
                      <div className="muted">Link</div>
                      <a className="bold-link" href={shareResult.url} target="_blank" rel="noopener noreferrer">
                        {shareResult.url}
                      </a>
                      <div className="btn-row">
                        <button
                          className="btn btn-light"
                          onClick={() => { navigator.clipboard.writeText(shareResult.url); toast.success("Link copied"); }}
                        >
                          Copy link
                        </button>
                        {shareResult.to_user_email && (
                          <button
                            className="btn btn-accent"
                            disabled={notifying}
                            onClick={() => notifyShare(shareResult.share_id, shareResult.to_user_email)}
                            title="Resend email (with embedded QR image)"
                          >
                            {notifying ? "Sending…" : "Resend email"}
                          </button>
                        )}
                        <a className="btn btn-light" href={qrImgForShareId(shareResult.share_id)} download>
                          Download QR
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirm / Edit modals */}
      <AnimatePresence>
        {modal?.type === "deleteDoc" && (
          <ConfirmModal
            title="Delete document?"
            desc={`"${modal.file_name}" will be permanently removed.`}
            confirmText="Delete"
            tone="danger"
            onConfirm={confirmDeleteDoc}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "deleteShare" && (
          <ConfirmModal
            title="Delete share?"
            desc="This will remove the share link permanently."
            confirmText="Delete"
            tone="danger"
            onConfirm={confirmDeleteShare}
            onClose={() => setModal(null)}
          />
        )}
        {modal?.type === "editExpiry" && (
          <ExpiryModal
            current={modal.current}
            onSubmit={submitExpiry}
            onClose={() => setModal(null)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ---------- Modals ----------
function ConfirmModal({ title, desc, confirmText = "Confirm", tone = "primary", onConfirm, onClose }) {
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal small" onClick={(e) => e.stopPropagation()} initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
        <h3 className="modal-title">{title}</h3>
        <p className="muted" style={{ marginTop: 6 }}>{desc}</p>
        <div className="modal-actions">
          <button className={`btn ${tone === "danger" ? "btn-danger" : "btn-accent"}`} onClick={onConfirm}>{confirmText}</button>
          <button className="btn btn-light" onClick={onClose}>Cancel</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ExpiryModal({ current, onSubmit, onClose }) {
  const [val, setVal] = useState(current ? current.slice(0, 16) : "");
  return (
    <motion.div className="modal-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal small" onClick={(e) => e.stopPropagation()} initial={{ y: 28, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}>
        <h3 className="modal-title">Update Expiry</h3>
        <div className="form-grid">
          <label className="lbl">Expiry (optional)</label>
          <input className="input" type="datetime-local" value={val} onChange={(e) => setVal(e.target.value)} />
        </div>
        <div className="modal-actions">
          <button className="btn btn-accent" onClick={() => onSubmit(val || null)}>Save</button>
          <button className="btn btn-light" onClick={() => onSubmit(null)}>Remove</button>
          <button className="btn btn-light" onClick={onClose}>Close</button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- bright styles (purple-aligned + responsive) ----------
function StyleBright() {
  return (
    <style>{`
/* === Subtle mint bg to keep your original vibe === */
html, body, #root { background: linear-gradient(180deg, #EFFFF7 0%, #E3FFEF 50%, #DBFFF0 100%); min-height: 100%; }

/* layout */
.wrap{max-width:1280px;margin:24px auto;padding:0 16px;color:#0a1633;}
.header{display:flex;align-items:center;margin-bottom:14px;}
.brand{font-weight:800;font-size:22px;background:linear-gradient(90deg,#7c4dff,#a88cff);
  -webkit-background-clip:text;background-clip:text;color:transparent}
.who{margin-left:auto;font-size:14px;color:#33406a}

/* uploader */
.uploader{border:2px dashed #7c4dff;border-radius:14px;padding:20px;text-align:center;
  background:linear-gradient(180deg,#f6f2ff,#f6f2ff); color:#1a2550}
.uploader.drag{background:linear-gradient(180deg,#efe6ff,#f3edff);border-color:#a88cff}
.uploader .sep{margin:0 8px;color:#9aa4c7}

/* tabs */
.tabs{display:flex;gap:10px;margin:14px 0;flex-wrap:wrap}
.tab{border:none;padding:10px 14px;border-radius:999px;background:#efe9ff;color:#2a1d4e;
  font-weight:700;cursor:pointer;transition:transform .12s, box-shadow .12s}
.tab:hover{transform:translateY(-1px);box-shadow:0 6px 16px rgba(86,50,180,.15)}
.tab.active{background:var(--tab-accent); color:#fff; box-shadow:0 8px 20px rgba(0,0,0,.12)}

/* panel */
.panel{background:#fff;border:1px solid #e8e2ff;border-radius:14px;padding:16px;overflow-x:auto}

/* table */
.table-responsive{width:100%;overflow-x:auto}
.grid{width:100%;border-collapse:collapse;min-width:720px}
.grid th,.grid td{padding:10px;border-bottom:1px solid #efe9ff;vertical-align:middle}
.grid thead th{font-size:12px;letter-spacing:.04em;text-transform:uppercase;color:#5b4aa3}
.center{text-align:center}
.actions{display:flex;gap:8px;flex-wrap:wrap}
.cell-title{display:flex;flex-direction:column}
.file-name{font-weight:700;color:#2a1d4e}
.file-meta{font-size:12px;color:#7b6fb3}
.muted{color:#6f6aa0}
.linkish{background:none;border:none;color:#6f42c1;cursor:pointer;font-weight:600}
.linkish:hover{text-decoration:underline}

/* chips */
.chip{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:800}
.chip-green{background:#e9fff8;color:#0d7f65;border:1px solid #bff5e6}
.chip-violet{background:#f2eaff;color:#5a2bdc;border:1px solid #e1d6ff}

/* qr */
.qr-img{width:46px;height:46px;border-radius:8px;background:#fff;padding:4px;cursor:pointer;box-shadow:0 6px 16px rgba(0,0,0,.08)}
.qr{ text-align:center }

/* buttons */
.btn{border:none;border-radius:10px;padding:8px 12px;font-weight:700;cursor:pointer;transition:transform .08s, box-shadow .12s}
.btn:active{transform:translateY(1px)}
.btn-light{background:#efe9ff;color:#3a2b73}
.btn-accent{background:linear-gradient(90deg,#6f42c1,#5a32a3);color:#fff;box-shadow:0 8px 18px rgba(111,66,193,.25)}
.btn-accent:hover{box-shadow:0 10px 22px rgba(111,66,193,.32)}
.btn-danger{background:#ff6f91;color:#fff;box-shadow:0 8px 18px rgba(255,111,145,.25)}
.btn-danger:hover{box-shadow:0 10px 22px rgba(255,111,145,.3)}

/* modal */
.modal-backdrop{position:fixed;inset:0;background:rgba(20,16,40,.45);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:12px}
.modal{width:min(760px,92vw);background:#ffffff;border:1px solid #ece6ff;border-radius:16px;box-shadow:0 20px 60px rgba(20,16,40,.25);padding:20px}
.modal.small{width:min(480px,92vw)}
.modal-title{margin:0 0 10px 0;color:#2a1d4e}
.form-grid{display:grid;grid-template-columns:180px 1fr;gap:12px;align-items:center;margin-top:8px}
.lbl{font-size:13px;color:#5e4ea0}
.input{width:100%;padding:10px;border-radius:10px;border:1px solid #dfd6ff;background:#fbf9ff;color:#2a1d4e}
.hint{font-size:12px;margin-top:6px;color:#5a2bdc}
.modal-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.result{margin-top:16px;padding:14px;border:1px dashed #dcd2ff;border-radius:12px;background:#faf7ff}
.ok{color:#106b55;font-weight:700}
.qr-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:8px}
.qr-big{width:220px;height:220px;border-radius:12px;background:#fff;padding:10px;box-shadow:0 10px 26px rgba(0,0,0,.08)}
.link-box{min-width:260px}
.bold-link{color:#59359c;font-weight:800;word-break:break-all}
.btn-row{display:flex;gap:8px;margin-top:10px}

/* ======= RESPONSIVE ======= */
@media (max-width: 992px){
  .form-grid{grid-template-columns:150px 1fr}
  .grid{min-width:680px}
}
@media (max-width: 768px){
  .wrap{padding:0 12px}
  .brand{font-size:20px}
  .who{font-size:13px}
  .form-grid{grid-template-columns:1fr;gap:10px}
  .lbl{margin-bottom:4px}
  .qr-big{width:180px;height:180px}
  .qr-img{width:40px;height:40px}
  .btn{padding:8px 10px}
  .grid{min-width:640px}
}
@media (max-width: 480px){
  .uploader{padding:16px}
  .tabs{gap:8px}
  .tab{padding:8px 12px}
  .panel{padding:12px}
  .qr-big{width:150px;height:150px}
  .grid{min-width:560px}
}
`}</style>
  );
}
