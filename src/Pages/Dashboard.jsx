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
  return `https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(
    url
  )}`;
};
const fmtBytes = (n) => {
  if (n == null) return "-";
  const k = 1024,
    sizes = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.max(0, Math.floor(Math.log(n) / Math.log(k)));
  return `${(n / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
};
const saveCache = (k, v) => {
  try {
    localStorage.setItem(k, JSON.stringify(v));
  } catch {}
};
const readCache = (k, f) => {
  try {
    return JSON.parse(localStorage.getItem(k) || "null") ?? f;
  } catch {
    return f;
  }
};

// email regex (loose but practical)
const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

// ---------- animations ----------
const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};
const stagger = {
  show: {
    transition: { staggerChildren: 0.06, delayChildren: 0.06 },
  },
};

// ---------- component ----------
export default function Dashboard() {
  const user = useMemo(
    () => JSON.parse(localStorage.getItem("user") || "{}"),
    []
  );
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
  const [myShares, setMyShares] = useState(() =>
    readCache("myshares_cache", [])
  );
  const [received, setReceived] = useState(() =>
    readCache("received_cache", [])
  );
  const privateShares = useMemo(
    () => myShares.filter((s) => s.access === "private"),
    [myShares]
  );
  const publicShares = useMemo(
    () => myShares.filter((s) => s.access === "public"),
    [myShares]
  );

  // share modal
  const [shareFor, setShareFor] = useState(null); // document_id
  const [shareForm, setShareForm] = useState({
    to_user_email: "",
    expiry_time: "",
    access: "private",
  });
  const [shareResult, setShareResult] = useState(null);
  const [notifying, setNotifying] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const [emailExists, setEmailExists] = useState(null); // true | false | null
  const emailCheckSeq = useRef(0);

  // modals
  const [modal, setModal] = useState(null);
  // { type: 'deleteDoc', document_id, file_name }
  // { type: 'deleteShare', share_id }
  // { type: 'editExpiry', share_id, current }

  // upload
  const onDrop = (accepted) => accepted?.[0] && uploadFile(accepted[0]);
  const { getRootProps, getInputProps, isDragActive, open: openPicker } =
    useDropzone({ onDrop, noClick: true });

  // load
  async function load() {
    try {
      setLoading(true);
      const [a, b, c] = await Promise.all([
        api.get("/documents"),
        api.get("/shares/mine"),
        api.get("/shares/received"),
      ]);
      setDocs(a.data || []);
      setMyShares(b.data || []);
      setReceived(c.data || []);
      saveCache("docs_cache", a.data || []);
      saveCache("myshares_cache", b.data || []);
      saveCache("received_cache", c.data || []);
    } catch {
      toast.error("Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    load();
    // eslint-disable-next-line
  }, []);

  // upload
  async function uploadFile(file) {
    try {
      const form = new FormData();
      form.append("file", file);
      const { data } = await api.post("/documents/upload", form, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setDocs((d) => {
        const n = [data, ...d];
        saveCache("docs_cache", n);
        return n;
      });
      toast.success("Uploaded");
    } catch {
      toast.error("Upload failed");
    }
  }

  // delete doc (with modal)
  function askDeleteDoc(d) {
    setModal({
      type: "deleteDoc",
      document_id: d.document_id,
      file_name: d.file_name,
    });
  }
  async function confirmDeleteDoc() {
    if (!modal?.document_id) return;
    try {
      await api.delete(`/documents/${modal.document_id}`);
      setDocs((d) => {
        const n = d.filter((x) => x.document_id !== modal.document_id);
        saveCache("docs_cache", n);
        return n;
      });
      toast.success("Document deleted");
      setModal(null);
    } catch {
      toast.error("Delete failed");
    }
  }

  // shares
  async function revokeShare(share_id) {
    try {
      await api.post(`/shares/${share_id}/revoke`);
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);
      toast.success("Share revoked");
    } catch {
      toast.error("Failed to revoke");
    }
  }

  function askDeleteShare(share_id) {
    setModal({ type: "deleteShare", share_id });
  }
  async function confirmDeleteShare() {
    if (!modal?.share_id) return;
    try {
      await api.delete(`/shares/${modal.share_id}`);
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);
      toast.success("Share deleted");
      setModal(null);
    } catch {
      toast.error("Failed to delete share");
    }
  }

  function openEditExpiry(share) {
    setModal({
      type: "editExpiry",
      share_id: share.share_id,
      current: share.expiry_time || "",
    });
  }
  async function submitExpiry(newISO) {
    try {
      await api.patch(`/shares/${modal.share_id}/expiry`, {
        expiry_time: newISO || null,
      });
      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);
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
      setMyShares(mine);
      saveCache("myshares_cache", mine);
      toast.success("Share expired");
    } catch {
      toast.error("Failed to expire");
    }
  }

  // notify via server
  async function notifyShare(share_id, email) {
    try {
      setNotifying(true);
      await api.post("/shares/notify-share", { share_id });
      toast.success(`Email sent to ${email || "recipient"}`);
    } catch {
      toast.error("Failed to send email");
    } finally {
      setNotifying(false);
    }
  }

  // create share
  async function createShare() {
    try {
      const payload = {
        document_id: shareFor,
        to_email: shareForm.to_user_email || null,
        expiry_time: shareForm.expiry_time || null,
        access: shareForm.access,
      };
      const { data } = await api.post("/shares", payload);

      const result = {
        ...data,
        url: `${FRONTEND_URL}/share/${data.share_id}`,
        to_user_email: shareForm.to_user_email,
      };
      setShareResult(result);

      const mine = await api.get("/shares/mine").then((r) => r.data || []);
      setMyShares(mine);
      saveCache("myshares_cache", mine);

      if (result.to_user_email)
        await notifyShare(result.share_id, result.to_user_email);
      else toast.success("Share created");
    } catch (e) {
      toast.error(e?.response?.data?.error || "Share failed");
    }
  }

  // real-time email check
  useEffect(() => {
    const raw = (shareForm.to_user_email || "").trim();
    if (!raw) {
      setEmailExists(null);
      setCheckingEmail(false);
      return;
    }
    if (!emailRe.test(raw)) {
      setEmailExists(null);
      setCheckingEmail(false);
      return;
    }

    const seq = ++emailCheckSeq.current;
    setCheckingEmail(true);
    const t = setTimeout(async () => {
      try {
        const { data } = await api.get("/auth/exists", {
          params: { email: raw.toLowerCase() },
        });
        if (seq !== emailCheckSeq.current) return;
        setEmailExists(!!data?.exists);
        setShareForm((s) => {
          if (data?.exists && s.access !== "private")
            return { ...s, access: "private" };
          if (!data?.exists && s.access !== "public")
            return { ...s, access: "public" };
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

  // ---------- Card components ----------
  const DocCard = ({ d }) => (
    <motion.div variants={fadeUp} className="card hover-tilt">
      <div className="card-head">
        <div className="file-emoji" aria-hidden>📄</div>
        <div className="file-title">{d.file_name}</div>
      </div>
      <div className="meta">
        <span className={`badge ${d.is_public ? "badge-green" : "badge-mint"}`}>
          {d.is_public ? "PUBLIC" : "PRIVATE"}
        </span>
        <span className="dot">•</span>
        <span className="muted">{d.mime_type || "file"}</span>
        <span className="dot">•</span>
        <span className="muted">{fmtBytes(d.file_size_bytes)}</span>
      </div>
      <div className="card-actions">
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
        <button className="btn btn-danger" onClick={() => askDeleteDoc(d)}>
          Delete
        </button>
      </div>
    </motion.div>
  );

  const SentCard = ({ s }) => (
    <motion.div variants={fadeUp} className="card hover-tilt">
      <div className="card-head">
        <div className="file-emoji" aria-hidden>🔗</div>
        <button className="file-title linkish" title="Share details">
          {s.file_name || s.document_id}
        </button>
      </div>
      <div className="meta">
        <span className={`badge ${s.access === "public" ? "badge-green" : "badge-mint"}`}>
          {s.access === "public" ? "PUBLIC" : "PRIVATE"}
        </span>
        <span className="dot">•</span>
        <span className="muted">
          {s.expiry_time ? `Expires: ${s.expiry_time}` : "No expiry"}
        </span>
      </div>
      <div className="qr-line">
        <img
          src={qrImgForShareId(s.share_id)}
          alt="QR"
          className="qr-img"
          title="Open share in new tab"
          onClick={() =>
            window.open(
              `${FRONTEND_URL}/share/${s.share_id}`,
              "_blank",
              "noopener,noreferrer"
            )
          }
        />
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/share/${s.share_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open
        </a>
      </div>
      <div className="card-actions">
        <button className="btn btn-light" onClick={() => openEditExpiry(s)}>
          Expiry…
        </button>
        <button className="btn btn-light" onClick={() => expireNow(s.share_id)}>
          Expire now
        </button>
        <button className="btn btn-danger" onClick={() => revokeShare(s.share_id)}>
          Revoke
        </button>
        <button className="btn btn-danger" onClick={() => askDeleteShare(s.share_id)}>
          Delete
        </button>
      </div>
    </motion.div>
  );

  const RecvCard = ({ r }) => (
    <motion.div variants={fadeUp} className="card hover-tilt">
      <div className="card-head">
        <div className="file-emoji" aria-hidden>📥</div>
        <div className="file-title">{r.file_name}</div>
      </div>
      <div className="meta">
        <span className={`badge ${r.access === "public" ? "badge-green" : "badge-mint"}`}>
          {r.access === "public" ? "PUBLIC" : "PRIVATE"}
        </span>
        <span className="dot">•</span>
        <span className="muted">
          From {r.from_full_name || ""}{r.from_email ? ` (${r.from_email})` : ""}
        </span>
      </div>
      <div className="qr-line">
        <img
          src={qrImgForShareId(r.share_id)}
          alt="QR"
          className="qr-img"
          title="Open share in new tab"
          onClick={() =>
            window.open(
              `${FRONTEND_URL}/share/${r.share_id}`,
              "_blank",
              "noopener,noreferrer"
            )
          }
        />
        <a
          className="btn btn-light"
          href={`${FRONTEND_URL}/share/${r.share_id}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          Open
        </a>
      </div>
    </motion.div>
  );

  // ---------- render ----------
  return (
    <div className="wrap">
      <StyleBright />

      {/* Header */}
      <div className="header">
        <div className="brand">
          <span className="logo" aria-hidden>🔒</span>
          Secure-Doc
        </div>
        <div className="who" title={user?.email || ""}>{user?.email}</div>
      </div>

      {/* Uploader */}
      <motion.div
        {...getRootProps()}
        variants={fadeUp}
        initial="hidden"
        animate="show"
        className={`uploader ${isDragActive ? "drag" : ""}`}
      >
        <input {...getInputProps()} />
        <div className="uploader-line">
          <span className="uploader-text">Drag &amp; Drop to upload</span>
          <span className="sep">•</span>
          <button
            type="button"
            className="btn btn-accent"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              openPicker();
            }}
          >
            Choose file
          </button>
        </div>
        <div className="uploader-hint">PDF, DOCX, PNG, JPG, etc. (Max 25MB)</div>
      </motion.div>

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Dashboard sections">
        <button
          onClick={() => setActiveTab("docs")}
          className={`tab ${activeTab === "docs" ? "active" : ""}`}
          style={{ ["--tab-accent"]: "#2fbf71" }}
        >
          📂 My Documents
        </button>
        <button
          onClick={() => setActiveTab("private")}
          className={`tab ${activeTab === "private" ? "active" : ""}`}
          style={{ ["--tab-accent"]: "#22c08a" }}
        >
          🔒 Private Shares
        </button>
        <button
          onClick={() => setActiveTab("public")}
          className={`tab ${activeTab === "public" ? "active" : ""}`}
          style={{ ["--tab-accent"]: "#19d3a2" }}
        >
          🌍 Public Shares
        </button>
        <button
          onClick={() => setActiveTab("received")}
          className={`tab ${activeTab === "received" ? "active" : ""}`}
          style={{ ["--tab-accent"]: "#ffbf5e" }}
        >
          📥 Received
        </button>
      </div>

      {/* Content: Cards */}
      <div className="panel">
        {activeTab === "docs" && (
          loading ? (
            <CardSkeleton count={6} />
          ) : docs.length ? (
            <motion.div variants={stagger} initial="hidden" animate="show" className="cards">
              {docs.map((d) => <DocCard key={d.document_id} d={d} />)}
            </motion.div>
          ) : (
            <EmptyState title="No documents yet." />
          )
        )}

        {activeTab === "private" && (
          loading ? (
            <CardSkeleton count={6} />
          ) : privateShares.length ? (
            <motion.div variants={stagger} initial="hidden" animate="show" className="cards">
              {privateShares.map((s) => <SentCard key={s.share_id} s={s} />)}
            </motion.div>
          ) : (
            <EmptyState title="No private shares yet." />
          )
        )}

        {activeTab === "public" && (
          loading ? (
            <CardSkeleton count={6} />
          ) : publicShares.length ? (
            <motion.div variants={stagger} initial="hidden" animate="show" className="cards">
              {publicShares.map((s) => <SentCard key={s.share_id} s={s} />)}
            </motion.div>
          ) : (
            <EmptyState title="No public shares yet." />
          )
        )}

        {activeTab === "received" && (
          loading ? (
            <CardSkeleton count={6} />
          ) : received.length ? (
            <motion.div variants={stagger} initial="hidden" animate="show" className="cards">
              {received.map((r) => <RecvCard key={r.share_id} r={r} />)}
            </motion.div>
          ) : (
            <EmptyState title="No shares received." />
          )
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
            onClick={() => {
              setShareFor(null);
              setShareResult(null);
              setEmailExists(null);
            }}
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
                    onChange={(e) =>
                      setShareForm((s) => ({ ...s, to_user_email: e.target.value }))
                    }
                    autoComplete="email"
                  />
                  {!!shareForm.to_user_email && (
                    <div className="hint">
                      {checkingEmail
                        ? "Checking…"
                        : emailExists === true
                        ? "Registered user found — Private recommended."
                        : emailExists === false
                        ? "Not registered — Public recommended."
                        : ""}
                    </div>
                  )}
                </div>

                <label className="lbl">Access</label>
                <select
                  className="input"
                  value={shareForm.access}
                  onChange={(e) =>
                    setShareForm((s) => ({ ...s, access: e.target.value }))
                  }
                >
                  <option value="private">Private (OTP, can download)</option>
                  <option value="public">Public (view only)</option>
                </select>

                <label className="lbl">Expiry (optional)</label>
                <input
                  className="input"
                  type="datetime-local"
                  value={shareForm.expiry_time}
                  onChange={(e) =>
                    setShareForm((s) => ({ ...s, expiry_time: e.target.value }))
                  }
                />
              </div>

              <div className="modal-actions">
                <button className="btn btn-accent" onClick={createShare}>
                  Create &amp; Send
                </button>
                <button
                  className="btn btn-light"
                  onClick={() => {
                    setShareFor(null);
                    setShareResult(null);
                    setEmailExists(null);
                  }}
                >
                  Close
                </button>
              </div>

              {shareResult && (
                <div className="result">
                  <p className="ok">
                    ✅ Share created
                    {shareResult.to_user_email
                      ? ` and email sent to ${shareResult.to_user_email}.`
                      : "."}
                  </p>
                  <div className="qr-row">
                    <img
                      src={qrImgForShareId(shareResult.share_id)}
                      alt="QR"
                      className="qr-big"
                    />
                    <div className="link-box">
                      <div className="muted">Link</div>
                      <a
                        className="bold-link"
                        href={shareResult.url}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        {shareResult.url}
                      </a>
                      <div className="btn-row">
                        <button
                          className="btn btn-light"
                          onClick={() => {
                            navigator.clipboard.writeText(shareResult.url);
                            toast.success("Link copied");
                          }}
                        >
                          Copy link
                        </button>
                        {shareResult.to_user_email && (
                          <button
                            className="btn btn-accent"
                            disabled={notifying}
                            onClick={() =>
                              notifyShare(
                                shareResult.share_id,
                                shareResult.to_user_email
                              )
                            }
                            title="Resend email (with embedded QR image)"
                          >
                            {notifying ? "Sending…" : "Resend email"}
                          </button>
                        )}
                        <a
                          className="btn btn-light"
                          href={qrImgForShareId(shareResult.share_id)}
                          download
                        >
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
function ConfirmModal({
  title,
  desc,
  confirmText = "Confirm",
  tone = "primary",
  onConfirm,
  onClose,
}) {
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal small"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
      >
        <h3 className="modal-title">{title}</h3>
        <p className="muted" style={{ marginTop: 6 }}>
          {desc}
        </p>
        <div className="modal-actions">
          <button
            className={`btn ${tone === "danger" ? "btn-danger" : "btn-accent"}`}
            onClick={onConfirm}
          >
            {confirmText}
          </button>
          <button className="btn btn-light" onClick={onClose}>
            Cancel
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ExpiryModal({ current, onSubmit, onClose }) {
  const [val, setVal] = useState(current ? current.slice(0, 16) : "");
  return (
    <motion.div
      className="modal-backdrop"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <motion.div
        className="modal small"
        onClick={(e) => e.stopPropagation()}
        initial={{ y: 28, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
      >
        <h3 className="modal-title">Update Expiry</h3>
        <div className="form-grid">
          <label className="lbl">Expiry (optional)</label>
          <input
            className="input"
            type="datetime-local"
            value={val}
            onChange={(e) => setVal(e.target.value)}
          />
        </div>
        <div className="modal-actions">
          <button className="btn btn-accent" onClick={() => onSubmit(val || null)}>
            Save
          </button>
          <button className="btn btn-light" onClick={() => onSubmit(null)}>
            Remove
          </button>
          <button className="btn btn-light" onClick={onClose}>
            Close
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ---------- bright styles (cards) ----------
// ---------- bright styles (cards) ----------
function StyleBright() {
  return (
    <style>{`
/* ===== App background (matches Home.jsx) ===== */
html, body, #root {
  min-height: 100%;
  background-image:
    radial-gradient(46rem 24rem at 12% 90%, rgba(255,106,61,.22) 0%, rgba(255,106,61,0) 60%),
    radial-gradient(42rem 22rem at 88% 12%, rgba(255,77,136,.20) 0%, rgba(255,77,136,0) 60%),
    linear-gradient(135deg, #FFF7E6 0%, #E6F8FF 52%, #F6E5FF 100%);
}

/* ===== Base text colors (no black) ===== */
:root{
  --ink: #2F1B70;       /* primary text */
  --ink-soft: #5B3FB8;  /* secondary */
  --card: #FFFFFF;
  --border: rgba(124,92,255,.25);
  --glow-indigo: rgba(124,92,255,.28);
  --glow-cyan: rgba(34,211,238,.24);
  --glow-pink: rgba(255,77,136,.22);
}

/* layout */
.wrap{
  max-width:1280px;margin:24px auto;
  padding:0 clamp(12px, 2vw, 16px);
  color:var(--ink);
}
.header{display:flex;align-items:center;margin-bottom:14px;gap:10px;}
.brand{
  font-weight:900;font-size:clamp(18px,2.6vw,24px);
  display:inline-flex;align-items:center;gap:8px;
  background:linear-gradient(90deg,#FF6A3D,#FF4D88,#7C5CFF);
  -webkit-background-clip:text;background-clip:text;color:transparent
}
.logo{
  display:grid;place-items:center;width:24px;height:24px;
  background:#fff;border:1px solid var(--border);border-radius:8px;
  box-shadow:0 6px 18px var(--glow-indigo)
}
.who{
  margin-left:auto;font-size:13px;color:var(--ink-soft);
  max-width:50%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap
}

/* uploader */
.uploader{
  border:2px dashed rgba(124,92,255,.45);
  border-radius:14px;padding: clamp(14px,3vw,20px);text-align:center;
  background:linear-gradient(180deg,#FFFFFF, rgba(246,229,255,.45));
  color:var(--ink); box-shadow:0 12px 28px var(--glow-indigo);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, filter .18s ease;
}
.uploader.drag{
  transform:translateY(-2px);
  border-color:#7C5CFF;
  box-shadow:0 18px 42px var(--glow-indigo);
  filter:saturate(1.05)
}
.uploader-line{display:flex;gap:10px;align-items:center;justify-content:center;flex-wrap:wrap}
.uploader .sep{color:rgba(124,92,255,.8)}
.uploader-hint{margin-top:6px;font-size:12px;color:var(--ink-soft)}

/* tabs */
.tabs{display:flex;gap:10px;margin:14px 0;overflow:auto;padding-bottom:4px}
.tabs::-webkit-scrollbar{height:8px}
.tabs::-webkit-scrollbar-thumb{background:rgba(124,92,255,.18);border-radius:999px}
.tab{
  border:none;padding:10px 14px;border-radius:999px;
  background:rgba(255,255,255,.72);color:var(--ink);font-weight:900;cursor:pointer;white-space:nowrap;
  box-shadow:inset 0 0 0 1px var(--border), 0 8px 20px rgba(124,92,255,.12);
  transition: transform .12s, box-shadow .12s, filter .12s, background .12s;
}
.tab:hover{transform:translateY(-1px);box-shadow:0 12px 28px var(--glow-indigo)}
.tab.active{
  background: var(--tab-accent);
  color:#fff;                                     /* ensures strong contrast */
  box-shadow:0 14px 36px var(--glow-pink), 0 0 0 1px rgba(255,255,255,.35) inset;
}

/* panel */
.panel{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:14px;
  padding: clamp(12px,2vw,16px);
  box-shadow:0 14px 36px rgba(124,92,255,.15);
  backdrop-filter: blur(4px);
}

/* cards grid */
.cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.card{
  background:var(--card);
  border:1px solid var(--border);
  border-radius:14px;padding:14px;
  box-shadow:0 10px 26px rgba(34,211,238,.18);
  transition: transform .18s ease, box-shadow .18s ease, border-color .18s ease, filter .18s ease;
}
.card:hover{
  transform:translateY(-2px);
  box-shadow:0 16px 44px var(--glow-cyan);
  border-color:rgba(124,92,255,.4);
}
.hover-tilt{will-change:transform}

/* card content */
.card-head{display:flex;align-items:center;gap:10px;margin-bottom:6px}
.file-emoji{font-size:20px}
.file-title{font-weight:900;color:var(--ink);word-break:break-word;line-height:1.2}
.meta{display:flex;align-items:center;flex-wrap:wrap;gap:8px;color:var(--ink-soft);font-size:13px;margin-bottom:12px}
.dot{opacity:.6}
.qr-line{display:flex;align-items:center;gap:10px;margin-bottom:12px}

/* buttons (no dark fills; use bright gradients + dark-purple text where needed for AA) */
.btn{
  border:none;border-radius:10px;padding:8px 12px;font-weight:900;cursor:pointer;
  transition:transform .08s, box-shadow .12s, filter .12s; letter-spacing:.2px;
}
.btn:active{transform:translateY(1px)}
.btn:focus-visible{outline:3px solid rgba(124,92,255,.28);outline-offset:2px}
.btn-light{
  background:rgba(255,255,255,.82);
  color:var(--ink);
  box-shadow:0 8px 18px rgba(124,92,255,.14);
  border:1px solid var(--border);
}
.btn-light:hover{filter:brightness(1.03);box-shadow:0 10px 22px rgba(124,92,255,.18)}
.btn-accent{
  background:linear-gradient(90deg,#FF6A3D,#FF4D88,#7C5CFF);
  color:#2F1B70; /* better contrast than white on these brights */
  box-shadow:0 10px 26px rgba(255,77,136,.26);
  border:1px solid rgba(255,228,154,.6);
}
.btn-accent:hover{box-shadow:0 12px 30px rgba(124,92,255,.30)}
.btn-danger{
  background:#FF4D88;color:#fff;
  box-shadow:0 10px 22px rgba(255,77,136,.26);
  border:1px solid rgba(255,228,154,.5);
}
.btn-danger:hover{box-shadow:0 12px 26px rgba(255,77,136,.32)}

/* badges */
.badge{display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:900}
.badge-green{background:linear-gradient(90deg,#E6F8FF,#F6E5FF);color:#2F1B70;border:1px solid var(--border)}
.badge-mint{background:linear-gradient(90deg,#FFF7E6,#E6F8FF);color:#2F1B70;border:1px solid var(--border)}

/* linkish */
.linkish{background:none;border:none;color:#7C5CFF;cursor:pointer;font-weight:900}
.linkish:hover{text-decoration:underline}

/* qr */
.qr-img{
  width:48px;height:48px;border-radius:10px;background:#fff;padding:4px;
  box-shadow:0 10px 22px rgba(124,92,255,.16);cursor:pointer;border:1px solid var(--border)
}
.qr-big{
  width:220px;height:220px;border-radius:12px;background:#fff;padding:10px;
  box-shadow:0 12px 30px rgba(34,211,238,.22);border:1px solid var(--border)
}

/* empty */
.empty{padding:20px;text-align:center}
.empty-emoji{font-size:28px}
.empty-title{font-weight:900;color:var(--ink);margin-top:6px}
.empty-hint{color:var(--ink-soft);font-size:14px}

/* modal */
.modal-backdrop{
  position:fixed;inset:0;background:rgba(124,92,255,.20);
  backdrop-filter:blur(6px);display:flex;align-items:center;justify-content:center;z-index:1000;padding:12px
}
.modal{
  width:min(760px,92vw);background:var(--card);
  border:1px solid var(--border);border-radius:16px;
  box-shadow:0 20px 60px rgba(34,211,238,.28);padding:20px
}
.modal.small{width:min(480px,92vw)}
.modal-title{margin:0 0 10px 0;color:var(--ink)}
.form-grid{display:grid;grid-template-columns:160px 1fr;gap:12px;align-items:center;margin-top:8px}
@media (max-width:560px){.form-grid{grid-template-columns:1fr}}
.lbl{font-size:13px;color:var(--ink-soft)}
.input{
  width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);
  background:#FFFFFF;color:var(--ink);transition:border-color .12s, box-shadow .12s, transform .12s
}
.input:focus{border-color:#7C5CFF;box-shadow:0 0 0 3px rgba(124,92,255,.22);transform:translateY(-1px)}
.hint{font-size:12px;margin-top:6px;color:#FF4D88}
.modal-actions{display:flex;gap:10px;margin-top:14px;flex-wrap:wrap}
.result{
  margin-top:16px;padding:14px;border:1px dashed var(--border);
  border-radius:12px;background:linear-gradient(180deg,#FFFFFF,rgba(230,248,255,.6))
}
.ok{color:#2F1B70;font-weight:900}
.qr-row{display:flex;gap:16px;align-items:center;flex-wrap:wrap;margin-top:8px}
.link-box{min-width:260px;max-width:100%}
.bold-link{color:#7C5CFF;font-weight:900;word-break:break-all}
.btn-row{display:flex;gap:8px;margin-top:10px;flex-wrap:wrap}

/* skeleton cards */
.skeleton-cards{display:grid;gap:14px;grid-template-columns:repeat(auto-fit,minmax(260px,1fr))}
.skel-card{background:var(--card);border:1px solid var(--border);border-radius:14px;padding:14px}
.skel{background:rgba(230,248,255,.7);border-radius:8px;height:14px;overflow:hidden;position:relative}
.skel::after{content:"";position:absolute;inset:0;transform:translateX(-100%);
  background:linear-gradient(90deg,transparent,#FFFFFF,transparent);animation:shimmer 1.2s infinite}
.skel-line{height:16px;margin:8px 0}
@keyframes shimmer{100%{transform:translateX(100%)}}

/* motion preference */
@media (prefers-reduced-motion: reduce){
  *{animation-duration:.001ms !important; animation-iteration-count:1 !important; transition:none !important; scroll-behavior:auto !important;}
}
`}</style>
  );
}


/* ---------- Skeleton & Empty ---------- */
function CardSkeleton({ count = 6 }) {
  return (
    <div className="skeleton-cards">
      {Array.from({ length: count }).map((_, i) => (
        <div className="skel-card" key={i}>
          <div className="skel skel-line" />
          <div className="skel skel-line" />
          <div className="skel skel-line" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ title = "Nothing to show", hint }) {
  return (
    <div className="empty">
      <div className="empty-emoji" aria-hidden>📄</div>
      <div className="empty-title">{title}</div>
      {hint && <div className="empty-hint">{hint}</div>}
    </div>
  );
}
