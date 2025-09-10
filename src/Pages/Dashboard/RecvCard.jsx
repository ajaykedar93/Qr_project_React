import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useRef, useState } from "react";

/** Defaults to your deployment URLs, but can still be overridden via props */
const DEFAULT_API_BASE = "https://qr-project-express.onrender.com";
const DEFAULT_FRONTEND_URL = "https://qr-project-react.vercel.app";

const fadeUp = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.22 } },
};

/* ====== Small UI helpers (Modal + Toast) ====== */

function useLockBodyScroll(active) {
  useEffect(() => {
    if (!active) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => (document.body.style.overflow = original);
  }, [active]);
}

function Toast({ show, message, onClose }) {
  useEffect(() => {
    if (!show) return;
    const t = setTimeout(onClose, 2200);
    return () => clearTimeout(t);
  }, [show, onClose]);

  return (
    <AnimatePresence>
      {show ? (
        <motion.div
          initial={{ y: 24, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 24, opacity: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className="toast"
          role="status"
          aria-live="polite"
          style={{
            position: "fixed",
            bottom: 16,
            right: 16,
            background: "#111827",
            color: "#fff",
            padding: "10px 14px",
            borderRadius: 10,
            boxShadow: "0 10px 30px rgba(0,0,0,.25)",
            zIndex: 10000,
            fontSize: 14,
          }}
        >
          {message}
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  busy = false,
  onCancel,
  onConfirm,
}) {
  useLockBodyScroll(open);
  const dialogRef = useRef(null);
  const confirmBtnRef = useRef(null);

  useEffect(() => {
    if (open && confirmBtnRef.current) {
      confirmBtnRef.current.focus();
    }
  }, [open]);

  useEffect(() => {
    function onKey(e) {
      if (!open) return;
      if (e.key === "Escape") onCancel?.();
      if (e.key === "Enter") onConfirm?.();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel, onConfirm]);

  return (
    <AnimatePresence>
      {open ? (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.5 }}
            exit={{ opacity: 0 }}
            className="modal-backdrop"
            style={{
              position: "fixed",
              inset: 0,
              background: "#111827",
              zIndex: 9998,
            }}
          />
          {/* Dialog */}
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-title"
            aria-describedby="confirm-desc"
            ref={dialogRef}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="modal-card"
            style={{
              position: "fixed",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              width: "min(420px, 92vw)",
              background: "#fff",
              borderRadius: 16,
              boxShadow:
                "0 10px 30px rgba(0,0,0,.08), 0 40px 60px rgba(0,0,0,.12)",
              zIndex: 9999,
              overflow: "hidden",
            }}
          >
            <div style={{ padding: 18 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div
                  aria-hidden
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    background: danger ? "#fee2e2" : "#dbeafe",
                    display: "grid",
                    placeItems: "center",
                    fontSize: 18,
                  }}
                >
                  {danger ? "⚠️" : "🗑️"}
                </div>
                <h3 id="confirm-title" style={{ margin: 0, fontSize: 18 }}>
                  {title}
                </h3>
              </div>

              {description ? (
                <p
                  id="confirm-desc"
                  style={{ marginTop: 10, marginBottom: 0, color: "#4b5563" }}
                >
                  {description}
                </p>
              ) : null}

              <div
                style={{
                  display: "flex",
                  gap: 8,
                  justifyContent: "flex-end",
                  marginTop: 16,
                }}
              >
                <button
                  type="button"
                  className="btn btn-light"
                  onClick={onCancel}
                  disabled={busy}
                  style={{
                    border: "1px solid #e5e7eb",
                    background: "#fff",
                    padding: "8px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                  }}
                >
                  {cancelLabel}
                </button>
                <button
                  type="button"
                  ref={confirmBtnRef}
                  className="btn btn-danger"
                  onClick={onConfirm}
                  disabled={busy}
                  style={{
                    border: "1px solid transparent",
                    background: danger ? "#ef4444" : "#111827",
                    color: "#fff",
                    padding: "8px 12px",
                    borderRadius: 10,
                    cursor: "pointer",
                    opacity: busy ? 0.7 : 1,
                  }}
                >
                  {busy ? "Working…" : confirmLabel}
                </button>
              </div>
            </div>
          </motion.div>
        </>
      ) : null}
    </AnimatePresence>
  );
}

/* ====== Main Card ====== */

export default function RecvCard({
  r,
  FRONTEND_URL = DEFAULT_FRONTEND_URL,
  qrImgForShareId,
  apiBase = DEFAULT_API_BASE,
  onRemoved,
  onDeleted,
}) {
  const [busy, setBusy] = useState(false);
  const [removed, setRemoved] = useState(false);

  // modal state
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [confirmCfg, setConfirmCfg] = useState({
    title: "",
    description: "",
    confirmLabel: "Confirm",
    cancelLabel: "Cancel",
    danger: false,
    onConfirm: null,
  });

  // toast
  const [toast, setToast] = useState({ show: false, message: "" });

  const FRONT = FRONTEND_URL.replace(/\/$/, "");
  const API = apiBase.replace(/\/$/, "");

  const openShare = () =>
    window.open(`${FRONT}/share/${r.share_id}`, "_blank", "noopener,noreferrer");

  function openDialog(cfg) {
    setConfirmCfg((p) => ({ ...p, ...cfg }));
    setConfirmOpen(true);
  }
  function closeDialog() {
    setConfirmOpen(false);
  }

  async function doDismiss() {
    try {
      setBusy(true);
      const res = await fetch(`${API}/shares/${r.share_id}/dismiss`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Server returned ${res.status}`);
      }
      setRemoved(true);
      onRemoved?.(r.share_id);
      setToast({ show: true, message: "Removed from your received list." });
    } catch (err) {
      setToast({ show: true, message: `Couldn't remove: ${err.message}` });
    } finally {
      setBusy(false);
      closeDialog();
    }
  }

  async function doDeleteForAll() {
    try {
      setBusy(true);
      const res = await fetch(`${API}/shares/${r.share_id}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j?.error || `Server returned ${res.status}`);
      }
      setRemoved(true);
      onDeleted?.(r.share_id);
      setToast({ show: true, message: "Share deleted for everyone." });
    } catch (err) {
      setToast({ show: true, message: `Couldn't delete: ${err.message}` });
    } finally {
      setBusy(false);
      closeDialog();
    }
  }

  function handleRemoveForMeClick() {
    openDialog({
      title: `Remove “${r.file_name}” from your Received list?`,
      description:
        "This won’t delete the sender’s share. You can still access it again if they re-share.",
      confirmLabel: "Remove for me",
      cancelLabel: "Cancel",
      danger: false,
      onConfirm: doDismiss,
    });
  }

  function handleDeleteForEveryoneClick() {
    openDialog({
      title: "Delete this share for everyone?",
      description:
        "Only the owner can do this. All recipients will immediately lose access.",
      confirmLabel: "Delete share",
      cancelLabel: "Cancel",
      danger: true,
      onConfirm: doDeleteForAll,
    });
  }

  if (removed) return null;

  return (
    <>
      <motion.div variants={fadeUp} className="card hover-tilt">
        <div className="card-head">
          <div className="file-emoji" aria-hidden>
            📥
          </div>
          <div className="file-title">{r.file_name}</div>
        </div>

        <div className="meta">
          <span
            className={`badge ${r.access === "public" ? "badge-green" : "badge-mint"}`}
          >
            {r.access === "public" ? "PUBLIC" : "PRIVATE"}
          </span>
          <span className="dot">•</span>
          <span className="muted">
            From {r.from_full_name || ""}
            {r.from_email ? ` (${r.from_email})` : ""}
          </span>
        </div>

        <div className="qr-line">
          <img
            src={qrImgForShareId(r.share_id)}
            alt="QR"
            className="qr-img"
            title="Open share in new tab"
            onClick={openShare}
            role="button"
            style={{ cursor: "pointer" }}
          />

          <a
            className="btn btn-light"
            href={`${FRONT}/share/${r.share_id}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            Open
          </a>

          {/* Remove just for this recipient */}
          <button
            className="btn btn-ghost"
            onClick={handleRemoveForMeClick}
            disabled={busy}
            title="Remove from your Received list"
            style={{ marginLeft: 8 }}
          >
            {busy ? "Working…" : "🗑 Remove (me)"}
          </button>

          {/* Owner-only global delete (will error if not owner) */}
          <button
            className="btn btn-ghost danger"
            onClick={handleDeleteForEveryoneClick}
            disabled={busy}
            title="Delete this share for everyone (owner only)"
            style={{ marginLeft: 8 }}
          >
            {busy ? "Working…" : "❌ Delete (everyone)"}
          </button>
        </div>
      </motion.div>

      <ConfirmDialog
        open={confirmOpen}
        title={confirmCfg.title}
        description={confirmCfg.description}
        confirmLabel={confirmCfg.confirmLabel}
        cancelLabel={confirmCfg.cancelLabel}
        danger={confirmCfg.danger}
        busy={busy}
        onCancel={closeDialog}
        onConfirm={confirmCfg.onConfirm}
      />

      <Toast
        show={toast.show}
        message={toast.message}
        onClose={() => setToast((t) => ({ ...t, show: false }))}
      />
    </>
  );
}
